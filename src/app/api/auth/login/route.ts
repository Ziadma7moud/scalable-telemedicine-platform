
import { verifyUserCredentials } from "@/lib/auth";
import { db } from "@/db";
import { patients, doctors } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await verifyUserCredentials(email, password);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is inactive" },
        { status: 403 }
      );
    }

    // Look up profile ID based on role
    let profileId: string | null = null;

    if (user.role === "patient") {
      const profile = await db
        .select()
        .from(patients)
        .where(eq(patients.userId, user.userId));

      if (profile.length > 0) {
        profileId = profile[0].patientId.toString();
      }
    } else if (user.role === "doctor") {
      const profile = await db
        .select()
        .from(doctors)
        .where(eq(doctors.userId, user.userId));

      if (profile.length > 0) {
        profileId = profile[0].doctorId.toString();
      }
    }

    // Create a signed JWT
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const authToken = jwt.sign(
      {
        userId: user.userId.toString(),
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    // Store JWT in an HttpOnly cookie
    const cookieStore = await cookies();

    cookieStore.set("auth_token", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json(
      {
        message: "Login successful",
        user: {
          userId: user.userId.toString(),
          profileId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
