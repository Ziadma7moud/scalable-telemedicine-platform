"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Doctor {
  doctorId: number;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  bio: string;
  yearsOfExperience: number;
  email: string;
  phone: string;
  specialties: Array<{
    specialtyId: number;
    specialtyName: string;
  }>;
}

interface Slot {
  slotId: number;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

export default function DoctorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const doctorId = params.id as string;

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchDoctorDetails();
  }, [doctorId, router]);

  const fetchDoctorDetails = async () => {
    try {
      const response = await fetch(`/api/doctors/${doctorId}`);
      if (response.ok) {
        const data = await response.json();
        setDoctor(data.doctor);

        // Fetch slots for the next 30 days
        const today = new Date();
        const future = new Date(today);
        future.setDate(future.getDate() + 30);

        fetchSlots(today, future);
      }
    } catch (error) {
      console.error("Error fetching doctor:", error);
      setError("Failed to load doctor information");
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async (from: Date, to: Date) => {
    try {
      const fromStr = from.toISOString();
      const toStr = to.toISOString();
      const response = await fetch(
        `/api/doctors/${doctorId}/slots?from=${fromStr}&to=${toStr}`
      );
      if (response.ok) {
        const data = await response.json();
        setSlots(data.slots.filter((s: Slot) => !s.isBooked));
      }
    } catch (error) {
      console.error("Error fetching slots:", error);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedSlot) {
      setError("Please select a time slot");
      return;
    }

    setBooking(true);
    setError("");

    try {
      const userData = localStorage.getItem("user_data");
      if (!userData) {
        router.push("/login");
        return;
      }
      const parsedUser = JSON.parse(userData);

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: parsedUser.profileId,
          slotId: selectedSlot,
          reason,
        }),
      });

      if (response.ok) {
        alert("Appointment booked successfully!");
        router.push("/patient/dashboard");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to book appointment");
      }
    } catch (error) {
      console.error("Error booking appointment:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </main>
    );
  }

  if (!doctor) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-red-600">Doctor not found</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => router.back()}
          className="mb-6 text-blue-600 hover:underline"
        >
          ← Back
        </button>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Doctor Info */}
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h1 className="text-2xl font-bold text-slate-900">
                Dr. {doctor.firstName} {doctor.lastName}
              </h1>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-sm text-slate-600">License Number</p>
                  <p className="font-medium text-slate-900">
                    {doctor.licenseNumber}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-600">Experience</p>
                  <p className="font-medium text-slate-900">
                    {doctor.yearsOfExperience} years
                  </p>
                </div>

                {doctor.specialties.length > 0 && (
                  <div>
                    <p className="text-sm text-slate-600">Specialties</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {doctor.specialties.map((spec) => (
                        <span
                          key={spec.specialtyId}
                          className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
                        >
                          {spec.specialtyName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-slate-600">Email</p>
                  <p className="font-medium text-slate-900">{doctor.email}</p>
                </div>

                {doctor.phone && (
                  <div>
                    <p className="text-sm text-slate-600">Phone</p>
                    <p className="font-medium text-slate-900">{doctor.phone}</p>
                  </div>
                )}
              </div>

              {doctor.bio && (
                <div className="mt-6 border-t border-slate-200 pt-6">
                  <h3 className="font-semibold text-slate-900">About</h3>
                  <p className="mt-2 text-slate-600">{doctor.bio}</p>
                </div>
              )}
            </div>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">
                Book an Appointment
              </h2>

              {error && (
                <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Select a Time Slot
                  </label>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {slots.length === 0 ? (
                      <p className="text-slate-600">
                        No available slots. Please check back later.
                      </p>
                    ) : (
                      slots.map((slot) => (
                        <button
                          key={slot.slotId}
                          onClick={() => setSelectedSlot(slot.slotId)}
                          className={`rounded-lg border-2 p-3 text-left transition-colors ${
                            selectedSlot === slot.slotId
                              ? "border-blue-600 bg-blue-50"
                              : "border-slate-200 hover:border-blue-300"
                          }`}
                        >
                          <p className="font-medium text-slate-900">
                            {new Date(slot.startTime).toLocaleString()}
                          </p>
                          <p className="text-sm text-slate-600">
                            {new Date(slot.endTime).toLocaleTimeString()}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Reason for Visit (Optional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe your symptoms or reason for the appointment..."
                    rows={4}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleBookAppointment}
                  disabled={!selectedSlot || booking}
                  className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {booking ? "Booking..." : "Confirm Appointment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
