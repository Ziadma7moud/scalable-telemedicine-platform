
import { db } from "@/db";
import {
  users,
  patients,
  doctors,
  specialties,
  doctorSpecialties,
  availabilitySlots,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID, timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Seed is allowed only in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  // Verify the seed secret
  const seedSecret = process.env.SEED_SECRET;
  const requestSecret = req.headers.get("x-seed-secret");

  if (!seedSecret || !requestSecret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const expectedBuffer = Buffer.from(seedSecret, "utf8");
  const receivedBuffer = Buffer.from(requestSecret, "utf8");

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    console.log("Starting database seed...");

    const passwordHash = await hashPassword("password123");

    await db.transaction(async (tx) => {
      // 1. Create specialties without duplicating existing ones
      console.log("Creating specialties...");

      const specialtiesData = [
        {
          name: "Cardiology",
          description: "Heart and cardiovascular health",
        },
        {
          name: "Dermatology",
          description: "Skin health and treatment",
        },
        {
          name: "Neurology",
          description: "Brain and nervous system",
        },
        {
          name: "Pediatrics",
          description: "Children's health",
        },
        {
          name: "Orthopedics",
          description: "Bones and joints",
        },
      ];

      for (const specialty of specialtiesData) {
        await tx
          .insert(specialties)
          .values(specialty)
          .onConflictDoNothing();
      }

      const specialtiesList = await tx
        .select()
        .from(specialties)
        .where(
          inArray(
            specialties.name,
            specialtiesData.map((item) => item.name)
          )
        );

      const specialtyMap = new Map(
        specialtiesList.map((item) => [item.name, item.specialtyId])
      );

      // 2. Create or reuse the test patient
      console.log("Creating test patient...");

      const oldPatient = await tx
        .select()
        .from(users)
        .where(eq(users.email, "patient@example.com"))
        .limit(1);

      if (oldPatient.length > 0) {
        await tx
          .update(users)
          .set({ email: "patient@test.com" })
          .where(eq(users.userId, oldPatient[0].userId));
      }

      let patientResult = await tx
        .select()
        .from(users)
        .where(eq(users.email, "patient@test.com"))
        .limit(1);

      let patientUser = patientResult[0];

      if (!patientUser) {
        const result = await tx
          .insert(users)
          .values({
            email: "patient@test.com",
            passwordHash,
            role: "patient",
            firstName: "John",
            lastName: "Doe",
            phone: "+1234567890",
            isActive: true,
          })
          .returning();

        patientUser = result[0];
      }

      if (patientUser.role !== "patient") {
        throw new Error(
          "patient@test.com exists but does not have the patient role"
        );
      }

      // Ensure the patient profile exists
      const patientProfile = await tx
        .select()
        .from(patients)
        .where(eq(patients.userId, patientUser.userId))
        .limit(1);

      if (patientProfile.length === 0) {
        await tx.insert(patients).values({
          userId: patientUser.userId,
          dateOfBirth: "1990-05-15",
          gender: "Male",
        });
      }

      // 3. Create or reuse test doctors
      console.log("Creating test doctors...");

      const doctorsData = [
        {
          oldEmail: "cardio@example.com",
          email: "sara@test.com",
          firstName: "Sarah",
          lastName: "Smith",
          specialtyName: "Cardiology",
        },
        {
          oldEmail: "derma@example.com",
          email: "mike@test.com",
          firstName: "Mike",
          lastName: "Johnson",
          specialtyName: "Dermatology",
        },
        {
          oldEmail: "neuro@example.com",
          email: "emily@test.com",
          firstName: "Emily",
          lastName: "Wilson",
          specialtyName: "Neurology",
        },
      ];

      for (const doctorData of doctorsData) {
        // Rename old test account if it exists
        const oldAccount = await tx
          .select()
          .from(users)
          .where(eq(users.email, doctorData.oldEmail))
          .limit(1);

        if (oldAccount.length > 0) {
          const newEmailAccount = await tx
            .select()
            .from(users)
            .where(eq(users.email, doctorData.email))
            .limit(1);

          if (newEmailAccount.length === 0) {
            await tx
              .update(users)
              .set({ email: doctorData.email })
              .where(eq(users.userId, oldAccount[0].userId));
          }
        }

        // Find or create doctor user
        let doctorUserResult = await tx
          .select()
          .from(users)
          .where(eq(users.email, doctorData.email))
          .limit(1);

        let doctorUser = doctorUserResult[0];

        if (!doctorUser) {
          const result = await tx
            .insert(users)
            .values({
              email: doctorData.email,
              passwordHash,
              role: "doctor",
              firstName: doctorData.firstName,
              lastName: doctorData.lastName,
              phone: "+0987654321",
              isActive: true,
            })
            .returning();

          doctorUser = result[0];
        }

        if (doctorUser.role !== "doctor") {
          throw new Error(
            `${doctorData.email} exists but does not have the doctor role`
          );
        }

        // Ensure doctor profile exists
        let doctorResult = await tx
          .select()
          .from(doctors)
          .where(eq(doctors.userId, doctorUser.userId))
          .limit(1);

        let doctor = doctorResult[0];

        if (!doctor) {
          const result = await tx
            .insert(doctors)
            .values({
              userId: doctorUser.userId,
              licenseNumber: `LIC-${randomUUID()}`,
              yearsOfExperience: 5,
              bio: `Experienced ${doctorData.firstName} ${doctorData.lastName}`,
            })
            .returning();

          doctor = result[0];
        }

        // Ensure doctor specialty relation exists
        const specialtyId = specialtyMap.get(
          doctorData.specialtyName
        );

        if (!specialtyId) {
          throw new Error(
            `Specialty not found: ${doctorData.specialtyName}`
          );
        }

        const existingRelation = await tx
          .select()
          .from(doctorSpecialties)
          .where(
            and(
              eq(doctorSpecialties.doctorId, doctor.doctorId),
              eq(doctorSpecialties.specialtyId, specialtyId)
            )
          )
          .limit(1);

        if (existingRelation.length === 0) {
          await tx.insert(doctorSpecialties).values({
            doctorId: doctor.doctorId,
            specialtyId,
          });
        }

        // Create availability slots only if the doctor has none
        const existingSlots = await tx
          .select()
          .from(availabilitySlots)
          .where(eq(availabilitySlots.doctorId, doctor.doctorId))
          .limit(1);

        if (existingSlots.length === 0) {
          const now = new Date();

          for (let day = 0; day < 7; day++) {
            const slotDate = new Date(now);
            slotDate.setDate(slotDate.getDate() + day);
            slotDate.setHours(9, 0, 0, 0);

            for (let hour = 9; hour < 17; hour++) {
              const startTime = new Date(slotDate);
              startTime.setHours(hour, 0, 0, 0);

              const endTime = new Date(startTime);
              endTime.setHours(hour + 1, 0, 0, 0);

              await tx.insert(availabilitySlots).values({
                doctorId: doctor.doctorId,
                startTime,
                endTime,
                isBooked: false,
              });
            }
          }
        }

        console.log(`Verified doctor: ${doctorData.email}`);
      }
    });

    return NextResponse.json(
      {
        message: "Database seed completed successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error seeding database:", error);

    return NextResponse.json(
      { error: "Database seed failed" },
      { status: 500 }
    );
  }
}
