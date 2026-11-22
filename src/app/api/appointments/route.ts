
import { db } from "@/db";
import {
  appointments,
  availabilitySlots,
  patients,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

// Authenticate the current patient using the JWT cookie
async function getAuthenticatedPatient() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error("JWT_SECRET is not configured");
    return { error: "Internal server error", status: 500 as const };
  }

  let decoded: jwt.JwtPayload;

  try {
    const verified = jwt.verify(token, jwtSecret);

    if (
      typeof verified === "string" ||
      !verified ||
      typeof verified.userId !== "string" ||
      !/^\d+$/.test(verified.userId) ||
      verified.role !== "patient"
    ) {
      return { error: "Forbidden", status: 403 as const };
    }

    decoded = verified;
  } catch {
    return { error: "Unauthorized", status: 401 as const };
  }

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, BigInt(decoded.userId)))
    .limit(1);

  if (!patient) {
    return { error: "Patient profile not found", status: 404 as const };
  }

  return { patient };
}

// Create a new appointment
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedPatient();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body = await req.json();
    const { slotId, reason } = body;

    if (
      !slotId ||
      !/^\d+$/.test(String(slotId))
    ) {
      return NextResponse.json(
        { error: "Valid slotId is required" },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      const [slot] = await tx
        .update(availabilitySlots)
        .set({ isBooked: true })
        .where(
          and(
            eq(availabilitySlots.slotId, BigInt(slotId)),
            eq(availabilitySlots.isBooked, false)
          )
        )
        .returning();

      if (!slot) {
        return { type: "slot_unavailable" as const };
      }

      const [appointment] = await tx
        .insert(appointments)
        .values({
          patientId: auth.patient.patientId,
          slotId: BigInt(slotId),
          reason: reason || null,
          status: "booked",
        })
        .returning();

      return {
        type: "success" as const,
        appointment,
      };
    });

    if (result.type === "slot_unavailable") {
      return NextResponse.json(
        { error: "This slot is unavailable or already booked" },
        { status: 409 }
      );
    }

    const appointment = result.appointment;

    return NextResponse.json(
      {
        message: "Appointment booked successfully",
        appointment: {
          ...appointment,
          appointmentId: appointment.appointmentId.toString(),
          patientId: appointment.patientId.toString(),
          slotId: appointment.slotId.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating appointment:", error);

    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}

// Get appointments for the authenticated patient only
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedPatient();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const conditions = [
      eq(appointments.patientId, auth.patient.patientId),
    ];

    if (status) {
      if (!["booked", "completed", "cancelled"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid appointment status" },
          { status: 400 }
        );
      }

      conditions.push(
        eq(
          appointments.status,
          status as "booked" | "completed" | "cancelled"
        )
      );
    }

    const results = await db
      .select()
      .from(appointments)
      .where(and(...conditions));

    return NextResponse.json({
      appointments: results.map((appointment) => ({
        ...appointment,
        appointmentId: appointment.appointmentId.toString(),
        patientId: appointment.patientId.toString(),
        slotId: appointment.slotId.toString(),
      })),
      count: results.length,
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);

    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}
