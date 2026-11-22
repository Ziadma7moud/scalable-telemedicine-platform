
import { relations, sql } from "drizzle-orm";

import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  text,
  boolean,
  timestamp,
  smallint,
  date,
  integer,
  uniqueIndex,
  index,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";

// Enums
export const roleEnum = pgEnum("role", [
  "patient",
  "doctor",
  "admin",
]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "booked",
  "completed",
  "cancelled",
]);

// Users table
export const users = pgTable("users", {
  userId: bigserial("user_id", { mode: "bigint" }).primaryKey(),

  email: varchar("email", { length: 255 })
    .notNull()
    .unique(),

  passwordHash: varchar("password_hash", { length: 255 }).notNull(),

  role: roleEnum("role").notNull(),

  firstName: varchar("first_name", { length: 100 }).notNull(),

  lastName: varchar("last_name", { length: 100 }).notNull(),

  phone: varchar("phone", { length: 20 }),

  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at").notNull().defaultNow(),

  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Specialties table
export const specialties = pgTable("specialties", {
  specialtyId: integer("specialty_id")
    .primaryKey()
    .generatedAlwaysAsIdentity(),

  name: varchar("name", { length: 100 })
    .notNull()
    .unique(),

  description: text("description"),
});

// Patients table
export const patients = pgTable(
  "patients",
  {
    patientId: bigserial("patient_id", { mode: "bigint" }).primaryKey(),

    userId: bigint("user_id", { mode: "bigint" })
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),

    dateOfBirth: date("date_of_birth"),

    gender: varchar("gender", { length: 20 }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("patients_user_id_unique").on(table.userId),
  ]
);

// Doctors table
export const doctors = pgTable(
  "doctors",
  {
    doctorId: bigserial("doctor_id", { mode: "bigint" }).primaryKey(),

    userId: bigint("user_id", { mode: "bigint" })
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),

    licenseNumber: varchar("license_number", { length: 50 })
      .notNull()
      .unique(),

    bio: text("bio"),

    yearsOfExperience: smallint("years_of_experience"),

    createdAt: timestamp("created_at").notNull().defaultNow(),

    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("doctors_user_id_unique").on(table.userId),
  ]
);

// Doctor Specialties junction table
export const doctorSpecialties = pgTable(
  "doctor_specialties",
  {
    doctorId: bigint("doctor_id", { mode: "bigint" })
      .notNull()
      .references(() => doctors.doctorId, { onDelete: "cascade" }),

    specialtyId: integer("specialty_id")
      .notNull()
      .references(() => specialties.specialtyId, {
        onDelete: "cascade",
      }),
  },
  (table) => [
    primaryKey({
      columns: [table.doctorId, table.specialtyId],
    }),
  ]
);

// Availability Slots table
export const availabilitySlots = pgTable(
  "availability_slots",
  {
    slotId: bigserial("slot_id", { mode: "bigint" }).primaryKey(),

    doctorId: bigint("doctor_id", { mode: "bigint" })
      .notNull()
      .references(() => doctors.doctorId, { onDelete: "cascade" }),

    startTime: timestamp("start_time").notNull(),

    endTime: timestamp("end_time").notNull(),

    isBooked: boolean("is_booked").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_doctor_slots").on(table.doctorId),

    index("idx_slot_times").on(
      table.startTime,
      table.endTime
    ),

    uniqueIndex("idx_doctor_slot_unique").on(
      table.doctorId,
      table.startTime,
      table.endTime
    ),
  ]
);

// Appointments table
export const appointments = pgTable(
  "appointments",
  {
    appointmentId: bigserial("appointment_id", {
      mode: "bigint",
    }).primaryKey(),

    patientId: bigint("patient_id", { mode: "bigint" })
      .notNull()
      .references(() => patients.patientId, {
        onDelete: "cascade",
      }),

    slotId: bigint("slot_id", { mode: "bigint" })
      .notNull()
      .references(() => availabilitySlots.slotId, {
        onDelete: "cascade",
      }),

    status: appointmentStatusEnum("status")
      .notNull()
      .default("booked"),

    reason: text("reason"),

    cancelledAt: timestamp("cancelled_at"),

    createdAt: timestamp("created_at").notNull().defaultNow(),

    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_patient_appointments").on(table.patientId),

    index("idx_appointment_status").on(table.status),

    // Allow multiple cancelled appointments for the same slot,
    // but only one non-cancelled appointment per slot.
    uniqueIndex("appointments_slot_id_unique")
      .on(table.slotId)
      .where(sql`${table.status} <> 'cancelled'`),
  ]
);

// Users relations
export const usersRelations = relations(users, ({ one }) => ({
  patient: one(patients, {
    fields: [users.userId],
    references: [patients.userId],
  }),

  doctor: one(doctors, {
    fields: [users.userId],
    references: [doctors.userId],
  }),
}));

// Patients relations
export const patientsRelations = relations(
  patients,
  ({ one, many }) => ({
    user: one(users, {
      fields: [patients.userId],
      references: [users.userId],
    }),

    appointments: many(appointments),
  })
);

// Doctors relations
export const doctorsRelations = relations(
  doctors,
  ({ one, many }) => ({
    user: one(users, {
      fields: [doctors.userId],
      references: [users.userId],
    }),

    specialties: many(doctorSpecialties),

    availabilitySlots: many(availabilitySlots),
  })
);

// Specialties relations
export const specialtiesRelations = relations(
  specialties,
  ({ many }) => ({
    doctors: many(doctorSpecialties),
  })
);

// Doctor Specialties relations
export const doctorSpecialtiesRelations = relations(
  doctorSpecialties,
  ({ one }) => ({
    doctor: one(doctors, {
      fields: [doctorSpecialties.doctorId],
      references: [doctors.doctorId],
    }),

    specialty: one(specialties, {
      fields: [doctorSpecialties.specialtyId],
      references: [specialties.specialtyId],
    }),
  })
);

// Availability Slots relations
export const availabilitySlotsRelations = relations(
  availabilitySlots,
  ({ one, many }) => ({
    doctor: one(doctors, {
      fields: [availabilitySlots.doctorId],
      references: [doctors.doctorId],
    }),

    appointments: many(appointments),
  })
);

// Appointments relations
export const appointmentsRelations = relations(
  appointments,
  ({ one }) => ({
    patient: one(patients, {
      fields: [appointments.patientId],
      references: [patients.patientId],
    }),

    slot: one(availabilitySlots, {
      fields: [appointments.slotId],
      references: [availabilitySlots.slotId],
    }),
  })
);
