
import { db } from "@/db";
import {
  appointments,
  availabilitySlots,
  doctors,
  patients,
  users,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET() {
  try {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }

    // Get authentication token from cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify JWT
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

    // Get doctor profile
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

    // Get appointments belonging to this doctor
    const results = await db
      .select({
        appointmentId: appointments.appointmentId,
        status: appointments.status,
        reason: appointments.reason,
        createdAt: appointments.createdAt,

        patientId: patients.patientId,
        patientFirstName: users.firstName,
        patientLastName: users.lastName,
        patientEmail: users.email,

        slotId: availabilitySlots.slotId,
        startTime: availabilitySlots.startTime,
        endTime: availabilitySlots.endTime,
      })
      .from(appointments)
      .innerJoin(
        availabilitySlots,
        eq(appointments.slotId, availabilitySlots.slotId)
      )
      .innerJoin(
        patients,
        eq(appointments.patientId, patients.patientId)
      )
      .innerJoin(
        users,
        eq(patients.userId, users.userId)
      )
      .where(eq(availabilitySlots.doctorId, doctor.doctorId));

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
    console.error("Error fetching doctor appointments:", error);

    return NextResponse.json(
      { error: "Failed to fetch doctor appointments" },
      { status: 500 }
    );
  }
}
