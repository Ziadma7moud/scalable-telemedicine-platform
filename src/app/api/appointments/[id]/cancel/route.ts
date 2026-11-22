
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Validate appointment ID
    const { id } = await params;

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid appointment ID" },
        { status: 400 }
      );
    }

    const appointmentId = BigInt(id);

    // 2. Authenticate user using JWT cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured");

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    let decoded: jwt.JwtPayload;

    try {
      const verified = jwt.verify(token, jwtSecret);

      if (typeof verified === "string") {
        return NextResponse.json(
          { error: "Invalid authentication token" },
          { status: 401 }
        );
      }

      decoded = verified;
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired authentication token" },
        { status: 401 }
      );
    }

    // 3. Only patients can use this endpoint
    if (decoded.role !== "patient") {
      return NextResponse.json(
        { error: "Only patients can cancel appointments through this endpoint" },
        { status: 403 }
      );
    }

    if (
      typeof decoded.userId !== "string" ||
      !/^\d+$/.test(decoded.userId)
    ) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const userId = BigInt(decoded.userId);

    // 4. Find the patient's profile
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, userId));

    if (!patient) {
      return NextResponse.json(
        { error: "Patient profile not found" },
        { status: 403 }
      );
    }

    // 5. Cancel only appointments belonging to this patient
    const result = await db.transaction(async (tx) => {
      const [existingAppointment] = await tx
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.appointmentId, appointmentId),
            eq(appointments.patientId, patient.patientId)
          )
        );

      if (!existingAppointment) {
        return { type: "not_found" as const };
      }

      const [updatedAppointment] = await tx
        .update(appointments)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
        })
        .where(
          and(
            eq(appointments.appointmentId, appointmentId),
            eq(appointments.patientId, patient.patientId),
            eq(appointments.status, "booked")
          )
        )
        .returning();

      if (!updatedAppointment) {
        return { type: "cannot_cancel" as const };
      }

      await tx
        .update(availabilitySlots)
        .set({ isBooked: false })
        .where(
          eq(
            availabilitySlots.slotId,
            updatedAppointment.slotId
          )
        );

      return {
        type: "success" as const,
        appointment: updatedAppointment,
      };
    });

    if (result.type === "not_found") {
      return NextResponse.json(
        { error: "Appointment not found or does not belong to you" },
        { status: 404 }
      );
    }

    if (result.type === "cannot_cancel") {
      return NextResponse.json(
        { error: "Appointment is already cancelled or cannot be cancelled" },
        { status: 409 }
      );
    }

    const appointment = result.appointment;

    return NextResponse.json(
      {
        message: "Appointment cancelled successfully",
        appointment: {
          ...appointment,
          appointmentId: appointment.appointmentId.toString(),
          patientId: appointment.patientId.toString(),
          slotId: appointment.slotId.toString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error cancelling appointment:", error);

    return NextResponse.json(
      { error: "Failed to cancel appointment" },
      { status: 500 }
    );
  }
}
