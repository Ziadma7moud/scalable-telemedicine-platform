
import { db } from "@/db";
import { specialties, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET() {
  try {
    const specialtiesList = await db
      .select()
      .from(specialties);

    return NextResponse.json(
      {
        specialties: specialtiesList,
        count: specialtiesList.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching specialties:", error);

    return NextResponse.json(
      { error: "Failed to fetch specialties" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is not configured");

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    let decoded: jwt.JwtPayload;

    try {
      const verified = jwt.verify(token, secret);

      if (
        typeof verified !== "object" ||
        verified === null ||
        typeof verified.userId !== "string" ||
        verified.role !== "admin"
      ) {
        return NextResponse.json(
          { error: "Invalid or unauthorized token" },
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

    const userId = decoded.userId;

    if (!/^\d+$/.test(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 401 }
      );
    }

    const admin = await db
      .select({
        userId: users.userId,
      })
      .from(users)
      .where(
        and(
          eq(users.userId, BigInt(userId)),
          eq(users.role, "admin"),
          eq(users.isActive, true)
        )
      )
      .limit(1);

    if (admin.length === 0) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { name, description } = body as {
      name?: unknown;
      description?: unknown;
    };

    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 100
    ) {
      return NextResponse.json(
        { error: "Specialty name must be between 2 and 100 characters" },
        { status: 400 }
      );
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return NextResponse.json(
        { error: "Description must be a string" },
        { status: 400 }
      );
    }

    const result = await db
      .insert(specialties)
      .values({
        name: name.trim(),
        description:
          typeof description === "string"
            ? description.trim() || null
            : null,
      })
      .returning();

    return NextResponse.json(
      {
        message: "Specialty created successfully",
        specialty: result[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating specialty:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        { error: "Specialty already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create specialty" },
      { status: 500 }
    );
  }
}
