import { db } from "@/db";
import { availabilitySlots, doctors } from "@/db/schema";
import { eq, and, gte, lt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doctorId = BigInt(id);
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    // Verify doctor exists
    const doctor = await db
      .select()
      .from(doctors)
      .where(eq(doctors.doctorId, doctorId));

    if (!doctor.length) {
      return NextResponse.json(
        { error: "Doctor not found" },
        { status: 404 }
      );
    }

    let whereConditions = and(
      eq(availabilitySlots.doctorId, doctorId),
      eq(availabilitySlots.isBooked, false)
    );

    if (fromDate && toDate) {
      const fromDateTime = new Date(fromDate);
      const toDateTime = new Date(toDate);
      whereConditions = and(
        whereConditions,
        gte(availabilitySlots.startTime, fromDateTime),
        lt(availabilitySlots.startTime, toDateTime)
      ) as any;
    }

    const slots = await db
      .select()
      .from(availabilitySlots)
      .where(whereConditions);

    const serializedSlots = slots.map((slot: any) => ({
      ...slot,
      slotId: slot.slotId.toString(),
      doctorId: slot.doctorId.toString(),
    }));

    return NextResponse.json(
      {
        slots: serializedSlots,
        count: serializedSlots.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching slots:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch slots";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
