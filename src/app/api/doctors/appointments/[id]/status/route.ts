
import { db } from "@/db";
import {
  appointments,
  availabilitySlots,
  doctors,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid appointment ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { status } = body;

    if (!["completed", "cancelled"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid appointment status" },
        { status: 400 }
      );
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let decoded: jwt.JwtPayload;

    try {
      const verified = jwt.verify(token, jwtSecret);

      if (typeof verified === "string") {
        return NextResponse.json(
          { error: "Invalid token" },
          { status: 401 }
        );
      }

      decoded = verified;
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    if (
      decoded.role !== "doctor" ||
      typeof decoded.userId !== "string" ||
      !/^\d+$/.test(decoded.userId)
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const [doctor] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, BigInt(decoded.userId)));

    if (!doctor) {
      return NextResponse.json(
        { error: "Doctor profile not found" },
        { status: 404 }
      );
    }

    const result = await db.transaction(async (tx) => {
      const [appointment] = await tx
        .select({
          appointmentId: appointments.appointmentId,
          status: appointments.status,
          slotId: appointments.slotId,
        })
        .from(appointments)
        .innerJoin(
          availabilitySlots,
          eq(appointments.slotId, availabilitySlots.slotId)
        )
        .where(
          and(
            eq(appointments.appointmentId, BigInt(id)),
            eq(availabilitySlots.doctorId, doctor.doctorId)
          )
        );

      if (!appointment) {
        return { type: "not_found" as const };
      }

      if (appointment.status !== "booked") {
        return { type: "conflict" as const };
      }

      const [updatedAppointment] = await tx
        .update(appointments)
        .set({
          status,
          cancelledAt: status === "cancelled" ? new Date() : null,
        })
        .where(
          and(
            eq(appointments.appointmentId, BigInt(id)),
            eq(appointments.status, "booked")
          )
        )
        .returning();

      if (!updatedAppointment) {
        return { type: "conflict" as const };
      }

      if (status === "cancelled") {
        await tx
          .update(availabilitySlots)
          .set({ isBooked: false })
          .where(eq(availabilitySlots.slotId, appointment.slotId));
      }

      return {
        type: "success" as const,
        appointment: updatedAppointment,
      };
    });

    if (result.type === "not_found") {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    if (result.type === "conflict") {
      return NextResponse.json(
        { error: "Only booked appointments can be updated" },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: "Appointment status updated successfully",
      appointment: {
        ...result.appointment,
        appointmentId: result.appointment.appointmentId.toString(),
        patientId: result.appointment.patientId.toString(),
        slotId: result.appointment.slotId.toString(),
      },
    });
  } catch (error) {
    console.error("Error updating appointment status:", error);

    return NextResponse.json(
      { error: "Failed to update appointment status" },
      { status: 500 }
    );
  }
}
