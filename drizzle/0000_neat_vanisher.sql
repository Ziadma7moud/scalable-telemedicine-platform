CREATE TYPE "public"."appointment_status" AS ENUM('booked', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('patient', 'doctor', 'admin');--> statement-breakpoint
CREATE TABLE "appointments" (
	"appointment_id" bigserial PRIMARY KEY NOT NULL,
	"patient_id" bigint NOT NULL,
	"slot_id" bigint NOT NULL,
	"status" "appointment_status" DEFAULT 'booked' NOT NULL,
	"reason" text,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_slots" (
	"slot_id" bigserial PRIMARY KEY NOT NULL,
	"doctor_id" bigint NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"is_booked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_specialties" (
	"doctor_id" bigint NOT NULL,
	"specialty_id" integer NOT NULL,
	CONSTRAINT "doctor_specialties_doctor_id_specialty_id_pk" PRIMARY KEY("doctor_id","specialty_id")
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"doctor_id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"license_number" varchar(50) NOT NULL,
	"bio" text,
	"years_of_experience" smallint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "doctors_license_number_unique" UNIQUE("license_number")
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"patient_id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"date_of_birth" date,
	"gender" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specialties" (
	"specialty_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "specialties_specialty_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	"description" text,
	CONSTRAINT "specialties_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" bigserial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "role" NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_slot_id_availability_slots_slot_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."availability_slots"("slot_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_doctor_id_doctors_doctor_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("doctor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_specialties" ADD CONSTRAINT "doctor_specialties_doctor_id_doctors_doctor_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("doctor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_specialties" ADD CONSTRAINT "doctor_specialties_specialty_id_specialties_specialty_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("specialty_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_patient_appointments" ON "appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_appointment_status" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_slot_id_unique" ON "appointments" USING btree ("slot_id");--> statement-breakpoint
CREATE INDEX "idx_doctor_slots" ON "availability_slots" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "idx_slot_times" ON "availability_slots" USING btree ("start_time","end_time");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_doctor_slot_unique" ON "availability_slots" USING btree ("doctor_id","start_time","end_time");--> statement-breakpoint
CREATE UNIQUE INDEX "doctors_user_id_unique" ON "doctors" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "patients_user_id_unique" ON "patients" USING btree ("user_id");