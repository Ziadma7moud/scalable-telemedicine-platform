
import { db } from "@/db";
import {
  doctors,
  users,
  doctorSpecialties,
  specialties,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate doctor ID
    if (
      !/^\d+$/.test(id) ||
      !Number.isSafeInteger(Number(id)) ||
      Number(id) <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid doctor ID" },
        { status: 400 }
      );
    }

    const doctorId = BigInt(id);

    // Fetch doctor details
    const doctor = await db
      .select({
        doctorId: doctors.doctorId,
        userId: doctors.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        licenseNumber: doctors.licenseNumber,
        bio: doctors.bio,
        yearsOfExperience: doctors.yearsOfExperience,
        phone: users.phone,
        email: users.email,
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.userId))
      .where(eq(doctors.doctorId, doctorId));

    if (doctor.length === 0) {
      return NextResponse.json(
        { error: "Doctor not found" },
        { status: 404 }
      );
    }

    // Fetch doctor's specialties
    const doctorSpecs = await db
      .select({
        specialtyId: specialties.specialtyId,
        specialtyName: specialties.name,
        description: specialties.description,
      })
      .from(doctorSpecialties)
      .innerJoin(
        specialties,
        eq(
          doctorSpecialties.specialtyId,
          specialties.specialtyId
        )
      )
      .where(eq(doctorSpecialties.doctorId, doctorId));

    // Serialize BigInt values
    const serializedDoctor = {
      ...doctor[0],
      doctorId: doctor[0].doctorId.toString(),
      userId: doctor[0].userId.toString(),
      specialties: doctorSpecs,
    };

    return NextResponse.json(
      { doctor: serializedDoctor },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error fetching doctor:", error);

    return NextResponse.json(
      { error: "Failed to fetch doctor" },
      { status: 500 }
    );
  }
}
