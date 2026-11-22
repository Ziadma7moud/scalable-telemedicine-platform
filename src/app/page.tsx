"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      try {
        const decoded = JSON.parse(
          Buffer.from(token, "base64").toString("utf-8")
        );
        setUserRole(decoded.role);
      } catch (e) {
        // Token invalid, user will be redirected to login
      }
    }
  }, []);

  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Hero Section */}
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
              Connect with Healthcare
              <span className="block text-blue-600">Professionals Today</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600">
              Book appointments with qualified doctors online. Fast, secure, and
              convenient telemedicine platform for your health needs.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              {!userRole ? (
                <>
                  <Link
                    href="/register?role=patient"
                    className="rounded-lg bg-blue-600 px-8 py-3 text-center font-semibold text-white hover:bg-blue-700"
                  >
                    Register as Patient
                  </Link>
                  <Link
                    href="/register?role=doctor"
                    className="rounded-lg border-2 border-blue-600 px-8 py-3 text-center font-semibold text-blue-600 hover:bg-blue-50"
                  >
                    Register as Doctor
                  </Link>
                </>
              ) : userRole === "patient" ? (
                <Link
                  href="/patient/dashboard"
                  className="rounded-lg bg-blue-600 px-8 py-3 text-center font-semibold text-white hover:bg-blue-700"
                >
                  Go to Patient Dashboard
                </Link>
              ) : (
                <Link
                  href="/doctor/dashboard"
                  className="rounded-lg bg-blue-600 px-8 py-3 text-center font-semibold text-white hover:bg-blue-700"
                >
                  Go to Doctor Dashboard
                </Link>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 gap-6">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="text-3xl">🔍</div>
              <h3 className="mt-4 text-xl font-semibold text-slate-900">
                Find Doctors
              </h3>
              <p className="mt-2 text-slate-600">
                Search and browse qualified healthcare professionals by specialty
                and availability.
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="text-3xl">📅</div>
              <h3 className="mt-4 text-xl font-semibold text-slate-900">
                Easy Booking
              </h3>
              <p className="mt-2 text-slate-600">
                View real-time availability and book appointments in just a few
                clicks.
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="text-3xl">🔒</div>
              <h3 className="mt-4 text-xl font-semibold text-slate-900">
                Secure & Private
              </h3>
              <p className="mt-2 text-slate-600">
                Your health information is protected with enterprise-grade
                security.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-slate-900">
            How It Works
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                1
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Register
              </h3>
              <p className="mt-2 text-slate-600">
                Create an account as a patient or doctor.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                2
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Search & Browse
              </h3>
              <p className="mt-2 text-slate-600">
                Find doctors by specialty and check their availability.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                3
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Book & Confirm
              </h3>
              <p className="mt-2 text-slate-600">
                Reserve your slot and receive confirmation instantly.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
