"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Doctor {
  doctorId: number;
  firstName: string;
  lastName: string;
  yearsOfExperience: number;
  bio: string;
  email: string;
}

interface Specialty {
  specialtyId: number;
  name: string;
}

export default function SearchDoctorsPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchSpecialties();
    fetchDoctors();
  }, [router]);

  const fetchSpecialties = async () => {
    try {
      const response = await fetch("/api/specialties");
      if (response.ok) {
        const data = await response.json();
        setSpecialties(data.specialties);
      }
    } catch (error) {
      console.error("Error fetching specialties:", error);
    }
  };

  const fetchDoctors = async (specialtyId?: string, search?: string) => {
    setLoading(true);
    try {
      let url = "/api/doctors";
      const params = new URLSearchParams();
      if (specialtyId) params.append("specialtyId", specialtyId);
      if (search) params.append("search", search);
      if (params.toString()) url += "?" + params.toString();

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setDoctors(data.doctors);
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpecialtyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const specialty = e.target.value;
    setSelectedSpecialty(specialty);
    fetchDoctors(specialty, searchTerm);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDoctors(selectedSpecialty, searchTerm);
  };

  const handleViewDoctor = (doctorId: number) => {
    router.push(`/patient/doctor/${doctorId}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Find a Doctor</h1>
          <p className="mt-2 text-slate-600">
            Search and filter doctors by specialty
          </p>
        </div>

        {/* Search & Filter */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Specialty
                </label>
                <select
                  value={selectedSpecialty}
                  onChange={handleSpecialtyChange}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">All Specialties</option>
                  {specialties.map((spec) => (
                    <option key={spec.specialtyId} value={spec.specialtyId}>
                      {spec.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Doctor Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name..."
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Doctors List */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full text-center text-slate-600">
              Loading doctors...
            </div>
          ) : doctors.length === 0 ? (
            <div className="col-span-full text-center text-slate-600">
              No doctors found. Try adjusting your search criteria.
            </div>
          ) : (
            doctors.map((doctor) => (
              <div
                key={doctor.doctorId}
                className="rounded-lg bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Dr. {doctor.firstName} {doctor.lastName}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {doctor.yearsOfExperience} years experience
                    </p>
                  </div>
                </div>

                {doctor.bio && (
                  <p className="mb-4 text-sm text-slate-600 line-clamp-2">
                    {doctor.bio}
                  </p>
                )}

                <button
                  onClick={() => handleViewDoctor(doctor.doctorId)}
                  className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  View & Book
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
