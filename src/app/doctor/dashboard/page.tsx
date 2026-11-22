"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface User {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Doctor {
  doctorId: number;
  licenseNumber: string;
  bio: string;
  yearsOfExperience: number;
}

export default function DoctorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("user_data");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    
    // In a real app, you would fetch the doctor profile here
    // For now, we'll use the available data
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_data");
    router.push("/");
  };

  if (!user) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between rounded-lg bg-white p-6 shadow-sm mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Welcome, Dr. {user.firstName}
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-8">
          <Link
            href="/doctor/appointments"
            className="rounded-lg bg-blue-600 px-6 py-4 font-semibold text-white hover:bg-blue-700 text-center"
          >
            View My Appointments
          </Link>
          <Link
            href="/doctor/availability"
            className="rounded-lg bg-slate-600 px-6 py-4 font-semibold text-white hover:bg-slate-700 text-center"
          >
            Manage Availability
          </Link>
        </div>

        {/* Welcome Message */}
        <div className="rounded-lg bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Doctor Portal
          </h2>
          <p className="text-slate-600 mb-4">
            Welcome to your doctor dashboard. Here you can:
          </p>
          <ul className="space-y-2 text-slate-600">
            <li>✓ View all your appointments</li>
            <li>✓ Manage your availability slots</li>
            <li>✓ Update your profile information</li>
            <li>✓ Add specialties to your profile</li>
          </ul>
          <p className="mt-6 text-sm text-slate-500">
            Note: Full integration of doctor features including appointment
            details and consultation calls will be available soon.
          </p>
        </div>
      </div>
    </main>
  );
}
