
import { db } from "@/db";
import { doctors, users, doctorSpecialties } from "@/db/schema";
import { eq, inArray, or, ilike } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const specialtyId = searchParams.get("specialtyId");
    const search = searchParams.get("search")?.trim();

    // Validate specialty ID
    let parsedSpecialtyId: number | null = null;

    if (specialtyId !== null) {
      parsedSpecialtyId = Number(specialtyId);

      if (
        !/^\d+$/.test(specialtyId) ||
        !Number.isSafeInteger(parsedSpecialtyId) ||
        parsedSpecialtyId <= 0
      ) {
        return NextResponse.json(
          { error: "Invalid specialty ID" },
          { status: 400 }
        );
      }
    }

    let doctorsList: {
      doctorId: bigint;
      userId: bigint;
      firstName: string;
      lastName: string;
      licenseNumber: string;
      bio: string | null;
      yearsOfExperience: number | null;
      phone: string | null;
      email: string;
    }[] = [];

    // Filter doctors by specialty
    if (parsedSpecialtyId !== null) {
      const doctorIds = await db
        .selectDistinct({
          doctorId: doctorSpecialties.doctorId,
        })
        .from(doctorSpecialties)
        .where(
          eq(
            doctorSpecialties.specialtyId,
            parsedSpecialtyId
          )
        );

      if (doctorIds.length === 0) {
        return NextResponse.json(
          {
            doctors: [],
            count: 0,
          },
          { status: 200 }
        );
      }

      const ids = doctorIds.map((doctor) => doctor.doctorId);

      doctorsList = await db
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
        .where(inArray(doctors.doctorId, ids));

    // Search doctors by first or last name
    } else if (search) {
      doctorsList = await db
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
        .where(
          or(
            ilike(users.firstName, `%${search}%`),
            ilike(users.lastName, `%${search}%`)
          )
        );

    // Get all doctors
    } else {
      doctorsList = await db
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
        .innerJoin(users, eq(doctors.userId, users.userId));
    }

    // Convert BigInt values to strings for JSON
    const serializedDoctors = doctorsList.map((doctor) => ({
      ...doctor,
      doctorId: doctor.doctorId.toString(),
      userId: doctor.userId.toString(),
    }));

    return NextResponse.json(
      {
        doctors: serializedDoctors,
        count: serializedDoctors.length,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error fetching doctors:", error);

    return NextResponse.json(
      { error: "Failed to fetch doctors" },
      { status: 500 }
    );
  }
}
