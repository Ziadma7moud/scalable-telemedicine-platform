"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DoctorAvailabilityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const userRole = localStorage.getItem("user_role");

    if (!token || userRole !== "doctor") {
      router.push("/login");
      return;
    }
  }, [router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => router.push("/doctor/dashboard")}
            className="text-blue-600 hover:underline mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-slate-900">
            Manage Availability
          </h1>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-sm text-center">
          <p className="text-slate-600 mb-4">
            Availability management interface is coming soon.
          </p>
          <p className="text-sm text-slate-500">
            This feature will allow you to create and manage your available time
            slots for consultations.
          </p>
        </div>
      </div>
    </main>
  );
}
