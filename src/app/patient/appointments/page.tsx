
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Appointment {
  appointmentId: number;
  slotId: number;
  status: string;
  reason: string;
  createdAt: string;
  cancelledAt: string | null;
}

export default function AppointmentsPage() {
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const fetchAppointments = async () => {
    try {
      const userData = localStorage.getItem("user_data");

      if (!userData) {
        router.push("/login");
        return;
      }

      const parsedUser = JSON.parse(userData);

      let url = `/api/appointments?patientId=${parsedUser.profileId}`;

      if (filter !== "all") {
        url += `&status=${filter}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch appointments");
      }

      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("auth_token");

    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    fetchAppointments();
  }, [router, filter]);

  const handleCancel = async (appointmentId: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

    if (!confirmed) return;

    try {
      setCancellingId(appointmentId);

      const response = await fetch(
        `/api/appointments/${appointmentId}/cancel`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to cancel appointment");
        return;
      }

      alert("Appointment cancelled successfully");

      await fetchAppointments();
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      alert("An error occurred while cancelling the appointment");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">
            My Appointments
          </h1>

          <button
            onClick={() => router.push("/patient/search")}
            className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Book New
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-4">
          {["all", "booked", "completed", "cancelled"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-lg px-4 py-2 font-medium capitalize transition-colors ${
                filter === status
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="rounded-lg bg-white p-6 text-center text-slate-600">
              Loading appointments...
            </div>
          ) : appointments.length === 0 ? (
            <div className="rounded-lg bg-white p-6 text-center">
              <p className="text-slate-600">
                No appointments found
              </p>

              <button
                onClick={() => router.push("/patient/search")}
                className="mt-4 rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Book an Appointment
              </button>
            </div>
          ) : (
            appointments.map((apt) => (
              <div
                key={apt.appointmentId}
                className="rounded-lg bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Appointment #{apt.appointmentId}
                    </h3>

                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Status</p>
                        <p className="font-medium capitalize text-slate-900">
                          {apt.status}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-600">Booked On</p>
                        <p className="font-medium text-slate-900">
                          {new Date(apt.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {apt.reason && (
                        <div className="col-span-2">
                          <p className="text-slate-600">Reason</p>
                          <p className="font-medium text-slate-900">
                            {apt.reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {apt.status === "booked" && (
                    <button
                      onClick={() => handleCancel(apt.appointmentId)}
                      disabled={cancellingId === apt.appointmentId}
                      className="rounded-lg bg-red-600 px-6 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {cancellingId === apt.appointmentId
                        ? "Cancelling..."
                        : "Cancel"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </main>
  );
}
