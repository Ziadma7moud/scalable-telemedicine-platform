
import jwt from "jsonwebtoken";
import { hashPassword } from "@/lib/auth";
import { db } from "@/db";
import { users, patients, doctors } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // 1. Parse request body
    let body;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    const {
      email,
      password,
      confirmPassword,
      role,
      firstName,
      lastName,
      phone,
      licenseNumber,
      yearsOfExperience,
      bio,
      dateOfBirth,
      gender,
    } = body;

    // 2. Validate required fields
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof confirmPassword !== "string" ||
      typeof role !== "string" ||
      typeof firstName !== "string" ||
      typeof lastName !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();

    if (!normalizedEmail || !normalizedFirstName || !normalizedLastName) {
      return NextResponse.json(
        { error: "Email and names cannot be empty" },
        { status: 400 }
      );
    }

    // 3. Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailRegex.test(normalizedEmail) ||
      normalizedEmail.length > 254
    ) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    if (
      normalizedFirstName.length > 100 ||
      normalizedLastName.length > 100
    ) {
      return NextResponse.json(
        { error: "Name must not exceed 100 characters" },
        { status: 400 }
      );
    }

    // 4. Validate password
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    if (password.length < 8 || password.length > 128) {
      return NextResponse.json(
        { error: "Password must be between 8 and 128 characters" },
        { status: 400 }
      );
    }

    // 5. Validate role
    if (role !== "patient" && role !== "doctor") {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // 6. Validate optional phone
    if (
      phone !== undefined &&
      phone !== null &&
      typeof phone !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      );
    }

    const normalizedPhone =
      typeof phone === "string" ? phone.trim() || null : null;

    if (normalizedPhone && normalizedPhone.length > 20) {
      return NextResponse.json(
        { error: "Phone number is too long" },
        { status: 400 }
      );
    }

    // 7. Validate patient information
    if (role === "patient") {
      if (
        dateOfBirth !== undefined &&
        dateOfBirth !== null &&
        dateOfBirth !== ""
      ) {
        if (
          typeof dateOfBirth !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ||
          Number.isNaN(Date.parse(`${dateOfBirth}T00:00:00`))
        ) {
          return NextResponse.json(
            { error: "Invalid date of birth" },
            { status: 400 }
          );
        }

        const birthDate = new Date(`${dateOfBirth}T00:00:00`);
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        if (birthDate > today) {
          return NextResponse.json(
            { error: "Date of birth cannot be in the future" },
            { status: 400 }
          );
        }
      }

      if (
        gender !== undefined &&
        gender !== null &&
        gender !== "" &&
        (
          typeof gender !== "string" ||
          !["Male", "Female", "Other"].includes(gender)
        )
      ) {
        return NextResponse.json(
          { error: "Invalid gender value" },
          { status: 400 }
        );
      }
    }

    // 8. Validate doctor information
    let normalizedLicenseNumber: string | null = null;
    let experience = 0;
    let normalizedBio: string | null = null;

    if (role === "doctor") {
      if (
        typeof licenseNumber !== "string" ||
        !licenseNumber.trim()
      ) {
        return NextResponse.json(
          { error: "License number is required for doctors" },
          { status: 400 }
        );
      }

      normalizedLicenseNumber = licenseNumber.trim();

      if (normalizedLicenseNumber.length > 100) {
        return NextResponse.json(
          { error: "License number is too long" },
          { status: 400 }
        );
      }

      experience =
        yearsOfExperience === undefined ||
        yearsOfExperience === null ||
        yearsOfExperience === ""
          ? 0
          : Number(yearsOfExperience);

      if (
        !Number.isInteger(experience) ||
        experience < 0 ||
        experience > 80
      ) {
        return NextResponse.json(
          { error: "Years of experience must be between 0 and 80" },
          { status: 400 }
        );
      }

      if (
        bio !== undefined &&
        bio !== null &&
        typeof bio !== "string"
      ) {
        return NextResponse.json(
          { error: "Invalid doctor bio" },
          { status: 400 }
        );
      }

      normalizedBio =
        typeof bio === "string" ? bio.trim() || null : null;

      if (normalizedBio && normalizedBio.length > 2000) {
        return NextResponse.json(
          { error: "Bio must not exceed 2000 characters" },
          { status: 400 }
        );
      }
    }

    // 9. Validate JWT configuration
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured");

      return NextResponse.json(
        { error: "Registration service is temporarily unavailable" },
        { status: 500 }
      );
    }

    // 10. Hash password
    const passwordHash = await hashPassword(password);

    // 11. Create user and profile in one transaction
    const result = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: normalizedEmail,
          passwordHash,
          role,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          phone: normalizedPhone,
          isActive: true,
        })
        .returning();

      let profileId: string;

      if (role === "patient") {
        const patientValues: typeof patients.$inferInsert = {
          userId: user.userId,
          ...(dateOfBirth ? { dateOfBirth } : {}),
          ...(gender
            ? {
                gender:
                  gender as typeof patients.$inferInsert.gender,
              }
            : {}),
        };

        const [patient] = await tx
          .insert(patients)
          .values(patientValues)
          .returning();

        profileId = patient.patientId.toString();
      } else {
        const [doctor] = await tx
          .insert(doctors)
          .values({
            userId: user.userId,
            licenseNumber: normalizedLicenseNumber!,
            yearsOfExperience: experience,
            bio: normalizedBio,
          })
          .returning();

        profileId = doctor.doctorId.toString();
      }

      return { user, profileId };
    });

    // 12. Generate JWT for the newly registered user
    const token = jwt.sign(
      {
        userId: result.user.userId.toString(),
        email: result.user.email,
        role: result.user.role,
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    // 13. Return response and set authentication cookie
    const response = NextResponse.json(
      {
        message: "User registered successfully",
        userId: result.user.userId.toString(),
        profileId: result.profileId,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
      },
      { status: 201 }
    );

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    // 14. Handle duplicate entries
    const dbError = error as {
      code?: string;
      constraint?: string;
    };

    if (dbError?.code === "23505") {
      return NextResponse.json(
        { error: "Email or license number already exists" },
        { status: 409 }
      );
    }

    console.error("Registration error:", error);

    return NextResponse.json(
      { error: "Registration failed. Please try again later." },
      { status: 500 }
    );
  }
}
