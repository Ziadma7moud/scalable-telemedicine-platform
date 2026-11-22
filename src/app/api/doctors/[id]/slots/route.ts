
import { db } from "@/db";
import {
  availabilitySlots,
  doctors,
  users,
} from "@/db/schema";
import { eq, and, gte, gt, lt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getAuthenticatedDoctor(doctorId: bigint) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return { error: "Internal server error", status: 500 as const };
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (
      typeof decoded === "string" ||
      !decoded ||
      typeof decoded.userId !== "string" ||
      !/^\d+$/.test(decoded.userId) ||
      decoded.role !== "doctor"
    ) {
      return { error: "Forbidden", status: 403 as const };
    }

    const [doctor] = await db
      .select({ doctorId: doctors.doctorId })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.userId))
      .where(
        and(
          eq(doctors.doctorId, doctorId),
          eq(doctors.userId, BigInt(decoded.userId)),
          eq(users.isActive, true)
        )
      )
      .limit(1);

    if (!doctor) {
      return { error: "Doctor profile not found", status: 404 as const };
    }

    return { doctor };
  } catch {
    return { error: "Unauthorized", status: 401 as const };
  }
}

export async function GET(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!/^\d+$/.test(id) || BigInt(id) <= BigInt(0)) {
      return NextResponse.json(
        { error: "Invalid doctor ID" },
        { status: 400 }
      );
    }

    const doctorId = BigInt(id);
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    if (Boolean(fromDate) !== Boolean(toDate)) {
      return NextResponse.json(
        { error: "Both from and to dates are required" },
        { status: 400 }
      );
    }

    const [doctor] = await db
      .select({ doctorId: doctors.doctorId })
      .from(doctors)
      .where(eq(doctors.doctorId, doctorId))
      .limit(1);

    if (!doctor) {
      return NextResponse.json(
        { error: "Doctor not found" },
        { status: 404 }
      );
    }

    const conditions = [
      eq(availabilitySlots.doctorId, doctorId),
      eq(availabilitySlots.isBooked, false),
      gte(availabilitySlots.startTime, new Date()),
    ];

    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);

      if (
        Number.isNaN(from.getTime()) ||
        Number.isNaN(to.getTime()) ||
        from >= to
      ) {
        return NextResponse.json(
          { error: "Invalid date range" },
          { status: 400 }
        );
      }

      conditions.push(
        gte(availabilitySlots.startTime, from),
        lt(availabilitySlots.startTime, to)
      );
    }

    const slots = await db
      .select()
      .from(availabilitySlots)
      .where(and(...conditions))
      .orderBy(availabilitySlots.startTime);

    return NextResponse.json({
      slots: slots.map((slot) => ({
        ...slot,
        slotId: slot.slotId.toString(),
        doctorId: slot.doctorId.toString(),
      })),
      count: slots.length,
    });
  } catch (error) {
    console.error("Error fetching slots:", error);

    return NextResponse.json(
      { error: "Failed to fetch slots" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!/^\d+$/.test(id) || BigInt(id) <= BigInt(0)) {
      return NextResponse.json(
        { error: "Invalid doctor ID" },
        { status: 400 }
      );
    }

    const doctorId = BigInt(id);
    const auth = await getAuthenticatedDoctor(doctorId);

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body = await req.json();
    const { startTime, endTime } = body;

    if (
      typeof startTime !== "string" ||
      typeof endTime !== "string"
    ) {
      return NextResponse.json(
        { error: "Start time and end time are required" },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start <= new Date() ||
      end <= start
    ) {
      return NextResponse.json(
        { error: "Invalid appointment time range" },
        { status: 400 }
      );
    }

    const [existingSlot] = await db
      .select({ slotId: availabilitySlots.slotId })
      .from(availabilitySlots)
      .where(
        and(
          eq(availabilitySlots.doctorId, doctorId),
          lt(availabilitySlots.startTime, end),
          gt(availabilitySlots.endTime, start)
        )
      )
      .limit(1);

    if (existingSlot) {
      return NextResponse.json(
        { error: "This time overlaps with an existing slot" },
        { status: 409 }
      );
    }

    const [slot] = await db
      .insert(availabilitySlots)
      .values({
        doctorId,
        startTime: start,
        endTime: end,
        isBooked: false,
      })
      .returning();

    return NextResponse.json(
      {
        message: "Availability slot created successfully",
        slot: {
          ...slot,
          slotId: slot.slotId.toString(),
          doctorId: slot.doctorId.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating availability slot:", error);

    return NextResponse.json(
      { error: "Failed to create availability slot" },
      { status: 500 }
    );
  }
}
