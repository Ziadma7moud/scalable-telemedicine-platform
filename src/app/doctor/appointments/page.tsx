
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Appointment {
  appointmentId: string;
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  patientEmail: string;
  status: "booked" | "cancelled" | "completed";
  reason: string | null;
  createdAt: string;
  startTime: string;
  endTime: string;
}

type FilterStatus = "all" | "booked" | "cancelled" | "completed";

export default function DoctorAppointmentsPage() {
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const userRole = localStorage.getItem("user_role");

    if (userRole !== "doctor") {
      router.push("/login");
      return;
    }

    const fetchAppointments = async () => {
      try {
        const response = await fetch("/api/doctors/appointments", {
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch appointments");
        }

        setAppointments(data.appointments || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [router]);

  const updateAppointmentStatus = async (
    appointmentId: string,
    status: "completed" | "cancelled"
  ) => {
    const confirmed = window.confirm(
      status === "completed"
        ? "Are you sure you want to mark this appointment as completed?"
        : "Are you sure you want to cancel this appointment?"
    );

    if (!confirmed) return;

    setUpdatingId(appointmentId);
    setError("");

    try {
      const response = await fetch(
        `/api/doctors/appointments/${appointmentId}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update appointment");
      }

      setAppointments((previous) =>
        previous.map((appointment) =>
          appointment.appointmentId === appointmentId
            ? { ...appointment, status }
            : appointment
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredAppointments =
    filter === "all"
      ? appointments
      : appointments.filter((appointment) => appointment.status === filter);

  const statusStyle = (status: string) => {
    switch (status) {
      case "booked":
        return "bg-blue-100 text-blue-700";
      case "completed":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => router.push("/doctor/dashboard")}
            className="mb-4 text-blue-600 hover:underline"
          >
            ← Back to Dashboard
          </button>

          <h1 className="text-3xl font-bold text-slate-900">
            My Appointments
          </h1>

          <p className="mt-2 text-slate-600">
            View and manage your patient appointments.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Appointments</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {appointments.length}
            </p>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Booked</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {appointments.filter((a) => a.status === "booked").length}
            </p>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {appointments.filter((a) => a.status === "completed").length}
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {(["all", "booked", "cancelled", "completed"] as FilterStatus[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`rounded-lg px-5 py-2 font-medium capitalize transition ${
                  filter === status
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {status}
              </button>
            )
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-lg bg-white p-10 text-center">
            Loading appointments...
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="rounded-lg bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-700">
              No appointments found
            </p>
            <p className="mt-2 text-slate-500">
              There are no appointments in this category.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment.appointmentId}
                className="rounded-lg bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {appointment.patientFirstName}{" "}
                      {appointment.patientLastName}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {appointment.patientEmail}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-4 py-1 text-sm font-semibold capitalize ${statusStyle(
                      appointment.status
                    )}`}
                  >
                    {appointment.status}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500">Appointment Time</p>
                    <p className="mt-1 font-medium text-slate-800">
                      {formatDate(appointment.startTime)}
                    </p>
                    <p className="text-sm text-slate-500">
                      Until {formatDate(appointment.endTime)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500">Reason</p>
                    <p className="mt-1 font-medium text-slate-800">
                      {appointment.reason || "Not specified"}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-400">
                  Appointment ID: {appointment.appointmentId}
                </p>

                {appointment.status === "booked" && (
                  <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
                    <button
                      onClick={() =>
                        updateAppointmentStatus(
                          appointment.appointmentId,
                          "completed"
                        )
                      }
                      disabled={updatingId === appointment.appointmentId}
                      className="rounded-lg bg-green-600 px-5 py-2 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updatingId === appointment.appointmentId
                        ? "Updating..."
                        : "Mark as Completed"}
                    </button>

                    <button
                      onClick={() =>
                        updateAppointmentStatus(
                          appointment.appointmentId,
                          "cancelled"
                        )
                      }
                      disabled={updatingId === appointment.appointmentId}
                      className="rounded-lg bg-red-600 px-5 py-2 font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updatingId === appointment.appointmentId
                        ? "Updating..."
                        : "Cancel Appointment"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
