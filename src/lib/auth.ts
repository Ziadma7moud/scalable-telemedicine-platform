
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

type Database = typeof db;

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");

    crypto.pbkdf2(
      password,
      salt,
      100000,
      64,
      "sha512",
      (err, derivedKey) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(`${salt}:${derivedKey.toString("hex")}`);
      }
    );
  });
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const parts = hash.split(":");

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return false;
  }

  const [salt, storedKey] = parts;

  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      100000,
      64,
      "sha512",
      (err, derivedKey) => {
        if (err) {
          reject(err);
          return;
        }

        const storedBuffer = Buffer.from(storedKey, "hex");
        const derivedBuffer = derivedKey;

        if (storedBuffer.length !== derivedBuffer.length) {
          resolve(false);
          return;
        }

        resolve(crypto.timingSafeEqual(storedBuffer, derivedBuffer));
      }
    );
  });
}

export async function getUserByEmail(
  email: string,
  database: Database = db
) {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await database
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  return result[0] || null;
}

export async function createUser(
  email: string,
  password: string,
  role: "patient" | "doctor" | "admin",
  firstName: string,
  lastName: string,
  phone?: string,
  database: Database = db
) {
  const normalizedEmail = email.trim().toLowerCase();

  const passwordHash = await hashPassword(password);

  const result = await database
    .insert(users)
    .values({
      email: normalizedEmail,
      passwordHash,
      role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone?.trim() || null,
      isActive: true,
    })
    .returning();

  return result[0];
}

export async function verifyUserCredentials(
  email: string,
  password: string
) {
  const user = await getUserByEmail(email);

  if (!user || !user.isActive) {
    return null;
  }

  const passwordMatch = await verifyPassword(
    password,
    user.passwordHash
  );

  if (!passwordMatch) {
    return null;
  }

  return user;
}
