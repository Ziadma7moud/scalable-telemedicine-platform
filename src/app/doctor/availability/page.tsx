
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type AvailabilitySlot = {
  slotId: string;
  doctorId: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
};

function formatDate(date: string) {
  return new Date(date).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getLocalDateTime(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

export default function DoctorAvailabilityPage() {
  const router = useRouter();

  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSlots = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/doctors/${id}/slots`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load availability");
      }

      setSlots(data.slots || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load availability"
      );
    }
  }, []);

  useEffect(() => {
    async function initializePage() {
      const token = localStorage.getItem("auth_token");
      const userRole = localStorage.getItem("user_role");

      if (!token || userRole !== "doctor") {
        router.push("/login");
        return;
      }

      try {
        const storedData = JSON.parse(
          localStorage.getItem("user_data") || "{}"
        );

        let id =
          storedData.doctorId ||
          storedData.doctor?.doctorId ||
          storedData.profile?.doctorId;

        // If doctorId is not stored locally, find it using the user ID.
        if (!id) {
          const response = await fetch("/api/doctors", {
            credentials: "include",
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error("Unable to identify doctor profile");
          }

          const doctorsList = Array.isArray(data)
            ? data
            : data.doctors || data.data || [];

          const currentDoctor = doctorsList.find(
            (doctor: any) =>
              String(doctor.userId ?? doctor.user?.userId) ===
              String(token)
          );

          id = currentDoctor?.doctorId;
        }

        if (!id) {
          throw new Error(
            "Doctor profile ID not found. Please check your doctor account."
          );
        }

        const resolvedId = String(id);

        setDoctorId(resolvedId);
        await loadSlots(resolvedId);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong"
        );
      } finally {
        setLoading(false);
      }
    }

    initializePage();
  }, [router, loadSlots]);

  async function handleAddSlot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!doctorId) {
      setError("Doctor profile not found");
      return;
    }

    setError("");
    setSuccess("");

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (
      !startTime ||
      !endTime ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      setError("Please select valid start and end times");
      return;
    }

    if (start <= new Date()) {
      setError("Start time must be in the future");
      return;
    }

    if (end <= start) {
      setError("End time must be after start time");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/doctors/${doctorId}/slots`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create availability slot");
      }

      setSuccess("Availability slot created successfully!");

      setStartTime("");
      setEndTime("");

      await loadSlots(doctorId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/doctor/dashboard")}
            className="mb-4 text-blue-600 hover:underline"
          >
            ← Back to Dashboard
          </button>

          <h1 className="text-3xl font-bold text-slate-900">
            Manage Availability
          </h1>

          <p className="mt-2 text-slate-600">
            Create and manage your available consultation time slots.
          </p>
        </div>

        {loading ? (
          <div className="rounded-lg bg-white p-10 text-center shadow-sm">
            <p className="text-slate-600">
              Loading availability...
            </p>
          </div>
        ) : (
          <>
            {/* Add Slot Form */}
            <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-xl font-semibold text-slate-900">
                Add New Availability
              </h2>

              <form onSubmit={handleAddSlot}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

                  <div>
                    <label
                      htmlFor="startTime"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Start Date & Time
                    </label>

                    <input
                      id="startTime"
                      type="datetime-local"
                      value={startTime}
                      min={getLocalDateTime(new Date())}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="endTime"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      End Date & Time
                    </label>

                    <input
                      id="endTime"
                      type="datetime-local"
                      value={endTime}
                      min={startTime || getLocalDateTime(new Date())}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                </div>

                {error && (
                  <div className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mt-5 rounded-lg bg-green-50 p-4 text-sm text-green-700">
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving || !doctorId}
                  className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Adding Slot..." : "+ Add Availability"}
                </button>
              </form>
            </section>

            {/* Available Slots */}
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Available Time Slots
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Your upcoming available consultation times.
                  </p>
                </div>

                <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
                  {slots.length} Available
                </span>
              </div>

              {slots.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center">
                  <p className="font-medium text-slate-700">
                    No available slots yet
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Add your first availability slot using the form above.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {slots.map((slot) => (
                    <div
                      key={slot.slotId}
                      className="rounded-lg border border-slate-200 p-5 transition hover:border-blue-300 hover:shadow-sm"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-800">
                          Slot #{slot.slotId}
                        </span>

                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                          Available
                        </span>
                      </div>

                      <div className="space-y-3 text-sm text-slate-600">
                        <div>
                          <p className="text-xs text-slate-400">
                            Start
                          </p>
                          <p className="font-medium text-slate-800">
                            {formatDate(slot.startTime)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">
                            End
                          </p>
                          <p className="font-medium text-slate-800">
                            {formatDate(slot.endTime)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
