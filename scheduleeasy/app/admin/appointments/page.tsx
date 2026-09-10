"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Appointment = {
  id: string;
  status: string;
  startsAt: string;
  endsAt: string;
  notes: string | null;
  service: { name: string };
  provider: { user: { name: string } };
  customer: { name: string; email: string };
};

const STATUS_BADGE: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  CANCELLED: "bg-red-100 text-red-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  RESCHEDULED: "bg-blue-100 text-blue-800",
};

export default function AdminAppointmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ dateFrom: "", dateTo: "", serviceId: "" });
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session.user.role !== "ADMIN") router.push("/");
  }, [status, session, router]);

  function loadAppointments() {
    setLoading(true);
    const q = new URLSearchParams();
    if (filters.dateFrom) q.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) q.set("dateTo", filters.dateTo + "T23:59:59Z");
    fetch(`/api/appointments?${q}`)
      .then((r) => r.json())
      .then(setAppointments)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (status === "authenticated") loadAppointments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function handleCancel(id: string) {
    if (!confirm("Cancel this appointment?")) return;
    setCancelling(id);
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    setCancelling(null);
    loadAppointments();
  }

  if (!session || session.user.role !== "ADMIN") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">
          ← Admin
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">All Appointments</h1>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <button
          onClick={loadAppointments}
          className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Filter
        </button>
        <button
          onClick={() => { setFilters({ dateFrom: "", dateTo: "", serviceId: "" }); }}
          className="text-gray-500 text-sm hover:text-gray-700"
        >
          Clear
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-8">Loading…</div>
      ) : appointments.length === 0 ? (
        <div className="text-gray-400 text-center py-8">No appointments found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-white border border-gray-200 rounded-xl overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200 text-left">
              <tr>
                {["Date (UTC)", "Customer", "Service", "Provider", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {appointments.map((apt) => (
                <tr key={apt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(apt.startsAt).toLocaleString("en-US", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: "UTC",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{apt.customer.name}</div>
                    <div className="text-gray-400 text-xs">{apt.customer.email}</div>
                  </td>
                  <td className="px-4 py-3">{apt.service.name}</td>
                  <td className="px-4 py-3">{apt.provider.user.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[apt.status] || ""}`}>
                      {apt.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(apt.status === "CONFIRMED" || apt.status === "PENDING") && (
                      <button
                        disabled={cancelling === apt.id}
                        onClick={() => handleCancel(apt.id)}
                        className="text-xs text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
                      >
                        {cancelling === apt.id ? "…" : "Cancel"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
