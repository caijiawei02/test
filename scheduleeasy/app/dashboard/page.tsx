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
  service: { name: string; durationMin: number };
  provider: { user: { name: string } };
};

const STATUS_BADGE: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  CANCELLED: "bg-red-100 text-red-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  RESCHEDULED: "bg-blue-100 text-blue-800",
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newSlotDate, setNewSlotDate] = useState("");
  const [newSlotTime, setNewSlotTime] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/dashboard");
    }
  }, [status, router]);

  function loadAppointments() {
    setLoading(true);
    fetch("/api/appointments")
      .then((r) => r.json())
      .then(setAppointments)
      .catch(() => setError("Failed to load appointments."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (status === "authenticated") loadAppointments();
  }, [status]);

  async function handleCancel(id: string) {
    if (!confirm("Cancel this appointment?")) return;
    setActionLoading(id + "-cancel");
    setError("");
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    setActionLoading(null);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Failed to cancel.");
      return;
    }
    loadAppointments();
  }

  async function handleReschedule(id: string) {
    if (!newSlotDate || !newSlotTime) {
      setError("Please select a new date and time.");
      return;
    }
    setActionLoading(id + "-reschedule");
    setError("");
    const newStartsAt = new Date(`${newSlotDate}T${newSlotTime}:00.000Z`).toISOString();
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reschedule", newStartsAt }),
    });
    setActionLoading(null);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error === "SLOT_TAKEN" ? "That slot is no longer available." : d.error || "Failed to reschedule.");
      return;
    }
    setRescheduleId(null);
    setNewSlotDate("");
    setNewSlotTime("");
    loadAppointments();
  }

  if (status === "loading" || loading) {
    return <div className="text-gray-400 text-center py-16">Loading…</div>;
  }

  const upcoming = appointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "PENDING"
  );
  const past = appointments.filter(
    (a) => a.status !== "CONFIRMED" && a.status !== "PENDING"
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
          <p className="text-gray-500 mt-1">Welcome back, {session?.user?.name}</p>
        </div>
        <Link
          href="/book"
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
        >
          + Book New
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Upcoming */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">
            No upcoming appointments.{" "}
            <Link href="/book" className="text-blue-600 hover:underline">
              Book one now
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((apt) => (
              <AppointmentCard
                key={apt.id}
                apt={apt}
                onCancel={handleCancel}
                onReschedule={(id) => {
                  setRescheduleId(id);
                  setNewSlotDate("");
                  setNewSlotTime("");
                  setError("");
                }}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}
      </section>

      {/* Reschedule panel */}
      {rescheduleId && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-blue-900">Reschedule Appointment</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Date (UTC)</label>
              <input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={newSlotDate}
                onChange={(e) => setNewSlotDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Time (UTC)</label>
              <input
                type="time"
                value={newSlotTime}
                onChange={(e) => setNewSlotTime(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              disabled={actionLoading === rescheduleId + "-reschedule"}
              onClick={() => handleReschedule(rescheduleId)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading === rescheduleId + "-reschedule" ? "Rescheduling…" : "Confirm Reschedule"}
            </button>
            <button
              onClick={() => setRescheduleId(null)}
              className="text-gray-500 text-sm hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-blue-700">
            Tip: Use the <Link href="/book" className="underline">booking page</Link> to browse available slots first.
          </p>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Past &amp; Cancelled</h2>
          <div className="space-y-3">
            {past.map((apt) => (
              <AppointmentCard
                key={apt.id}
                apt={apt}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AppointmentCard({
  apt,
  onCancel,
  onReschedule,
  actionLoading,
}: {
  apt: Appointment;
  onCancel?: (id: string) => void;
  onReschedule?: (id: string) => void;
  actionLoading: string | null;
}) {
  const isActive = apt.status === "CONFIRMED" || apt.status === "PENDING";
  const dateStr = new Date(apt.startsAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900">{apt.service.name}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[apt.status] || "bg-gray-100 text-gray-600"}`}
          >
            {apt.status}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {dateStr} (UTC) &middot; {apt.provider.user.name} &middot; {apt.service.durationMin} min
        </div>
        {apt.notes && <div className="text-xs text-gray-400 italic">{apt.notes}</div>}
        <div className="text-xs text-gray-300 font-mono">{apt.id}</div>
      </div>

      {isActive && (onCancel || onReschedule) && (
        <div className="flex gap-2 flex-shrink-0">
          {onReschedule && (
            <button
              onClick={() => onReschedule(apt.id)}
              className="text-sm text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Reschedule
            </button>
          )}
          {onCancel && (
            <button
              disabled={actionLoading === apt.id + "-cancel"}
              onClick={() => onCancel(apt.id)}
              className="text-sm text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {actionLoading === apt.id + "-cancel" ? "…" : "Cancel"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
