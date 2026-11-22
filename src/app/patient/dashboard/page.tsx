
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface User {
  userId: string;
  profileId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Appointment {
  appointmentId: number;
  slotId: number;
  status: string;
  reason: string;
  createdAt: string;
  cancelledAt: string | null;
}

export default function PatientDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const fetchAppointments = useCallback(async () => {
    const response = await fetch("/api/appointments", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch appointments");
    }

    const data = await response.json();
    setAppointments(data.appointments || []);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initializeDashboard = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const userData = localStorage.getItem("user_data");

        if (!token || !userData) {
          router.replace("/login");
          return;
        }

        const parsedUser: User = JSON.parse(userData);

        if (parsedUser.role !== "patient") {
          router.replace("/login");
          return;
        }

        if (!cancelled) {
          setUser(parsedUser);
        }

        await fetchAppointments();
      } catch (error) {
        console.error("Dashboard initialization error:", error);

        if (!cancelled) {
          setAppointments([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void initializeDashboard();

    return () => {
      cancelled = true;
    };
  }, [router, fetchAppointments]);

  const handleCancel = async (appointmentId: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

    if (!confirmed) return;

    setCancellingId(appointmentId);

    try {
      const response = await fetch(
        `/api/appointments/${appointmentId}/cancel`,
        {
          method: "POST",
          credentials: "same-origin",
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel appointment");
      }

      alert("Appointment cancelled successfully");
      await fetchAppointments();
    } catch (error) {
      console.error("Error cancelling appointment:", error);

      alert(
        error instanceof Error
          ? error.message
          : "An error occurred while cancelling the appointment"
      );
    } finally {
      setCancellingId(null);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_data");

    router.replace("/login");
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  const upcomingAppointments = appointments.filter(
    (apt) => apt.status !== "cancelled"
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between rounded-lg bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Welcome, {user.firstName}
            </h1>
            <p className="mt-1 text-slate-600">{user.email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-600 px-6 py-2 font-semibold text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        <div className="mb-8 flex flex-wrap gap-4">
          <Link
            href="/patient/search"
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Search Doctors
          </Link>

          <Link
            href="/patient/appointments"
            className="rounded-lg bg-slate-600 px-6 py-3 font-semibold text-white hover:bg-slate-700"
          >
            View All Appointments
          </Link>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">
            Upcoming Appointments
          </h2>

          {upcomingAppointments.length === 0 ? (
            <div className="mt-6 text-center">
              <p className="text-slate-600">
                No appointments scheduled yet.
              </p>

              <Link
                href="/patient/search"
                className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Book an Appointment
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {upcomingAppointments.map((apt) => (
                <div
                  key={apt.appointmentId}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">
                        Appointment #{apt.appointmentId}
                      </p>

                      <p className="text-sm text-slate-600">
                        Status:{" "}
                        <span className="font-medium capitalize">
                          {apt.status}
                        </span>
                      </p>

                      <p className="text-sm text-slate-600">
                        Reason: {apt.reason || "N/A"}
                      </p>

                      <p className="text-sm text-slate-600">
                        Booked On:{" "}
                        {new Date(apt.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {apt.status === "booked" && (
                      <button
                        onClick={() => handleCancel(apt.appointmentId)}
                        disabled={cancellingId === apt.appointmentId}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {cancellingId === apt.appointmentId
                          ? "Cancelling..."
                          : "Cancel"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
