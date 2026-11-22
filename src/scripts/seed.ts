import { db } from "@/db";
import {
  users,
  patients,
  doctors,
  specialties,
  doctorSpecialties,
  availabilitySlots,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";

async function seed() {
  console.log("Starting database seed...");

  try {
    // Create specialties
    console.log("Creating specialties...");
    const specialtiesData = await db
      .insert(specialties)
      .values([
        { name: "Cardiology", description: "Heart and cardiovascular health" },
        { name: "Dermatology", description: "Skin health and treatment" },
        { name: "Neurology", description: "Brain and nervous system" },
        { name: "Pediatrics", description: "Children's health" },
        { name: "Orthopedics", description: "Bones and joints" },
      ])
      .returning();

    console.log(`Created ${specialtiesData.length} specialties`);

    // Create test patient user
    console.log("Creating test patient...");
    const patientPasswordHash = await hashPassword("password123");
    const patientUser = await db
      .insert(users)
      .values({
        email: "patient@example.com",
        passwordHash: patientPasswordHash,
        role: "patient",
        firstName: "John",
        lastName: "Doe",
        phone: "+1234567890",
        isActive: true,
      })
      .returning();

    await db.insert(patients).values({
      userId: patientUser[0].userId,
      dateOfBirth: "1990-05-15",
      gender: "Male",
    });

    console.log("Created patient user");

    // Create test doctor users
    console.log("Creating test doctors...");
    const doctorsList = [
      {
        email: "cardio@example.com",
        firstName: "Sarah",
        lastName: "Smith",
        specialty: specialtiesData[0].specialtyId, // Cardiology
      },
      {
        email: "derma@example.com",
        firstName: "Mike",
        lastName: "Johnson",
        specialty: specialtiesData[1].specialtyId, // Dermatology
      },
      {
        email: "neuro@example.com",
        firstName: "Emily",
        lastName: "Wilson",
        specialty: specialtiesData[2].specialtyId, // Neurology
      },
    ];

    for (const doctorData of doctorsList) {
      const passwordHash = await hashPassword("password123");
      const doctorUser = await db
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

      const doctor = await db
        .insert(doctors)
        .values({
          userId: doctorUser[0].userId,
          licenseNumber: `LIC-${Math.random().toString(36).substring(7).toUpperCase()}`,
          yearsOfExperience: Math.floor(Math.random() * 30) + 1,
          bio: `Experienced ${doctorData.firstName} ${doctorData.lastName} with expertise in their field.`,
        })
        .returning();

      // Add specialty
      await db.insert(doctorSpecialties).values({
        doctorId: doctor[0].doctorId,
        specialtyId: doctorData.specialty,
      });

      // Create availability slots for the next 7 days
      const now = new Date();
      for (let day = 0; day < 7; day++) {
        const slotDate = new Date(now);
        slotDate.setDate(slotDate.getDate() + day);
        slotDate.setHours(9, 0, 0, 0);

        // Create 8 slots per day (9 AM to 5 PM)
        for (let hour = 9; hour < 17; hour++) {
          const startTime = new Date(slotDate);
          startTime.setHours(hour, 0, 0, 0);

          const endTime = new Date(startTime);
          endTime.setHours(hour + 1);

          await db.insert(availabilitySlots).values({
            doctorId: doctor[0].doctorId,
            startTime,
            endTime,
            isBooked: false,
          });
        }
      }

      console.log(
        `Created doctor: ${doctorData.firstName} ${doctorData.lastName}`
      );
    }

    console.log("Database seed completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
