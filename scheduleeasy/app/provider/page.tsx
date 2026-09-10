"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Appointment = {
  id: string;
  status: string;
  startsAt: string;
  endsAt: string;
  notes: string | null;
  service: { name: string; durationMin: number };
  customer: { name: string; email: string };
};

type AvailBlock = { id: string; dayOfWeek: number; startTime: string; endTime: string; active: boolean };

export default function ProviderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [providerId, setProviderId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availability, setAvailability] = useState<AvailBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"appointments" | "availability">("appointments");
  const [newAvail, setNewAvail] = useState({ dayOfWeek: "1", startTime: "09:00", endTime: "17:00" });
  const [savingAvail, setSavingAvail] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session.user.role !== "PROVIDER") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated" || !session) return;
    // Get provider record
    fetch("/api/providers")
      .then((r) => r.json())
      .then((providers: Array<{ id: string; user: { id: string } }>) => {
        const mine = providers.find((p) => p.user.id === session.user.id);
        if (mine) {
          setProviderId(mine.id);
          return mine.id;
        }
        return null;
      })
      .then((pid) => {
        if (!pid) return;
        Promise.all([
          fetch("/api/appointments").then((r) => r.json()),
          fetch(`/api/providers/${pid}/availability`).then((r) => r.json()),
        ]).then(([apts, avail]) => {
          setAppointments(apts);
          setAvailability(avail);
        }).finally(() => setLoading(false));
      });
  }, [status, session]);

  async function handleAddAvail() {
    if (!providerId) return;
    setSavingAvail(true);
    setError("");
    const res = await fetch(`/api/providers/${providerId}/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayOfWeek: Number(newAvail.dayOfWeek), startTime: newAvail.startTime, endTime: newAvail.endTime }),
    });
    setSavingAvail(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return; }
    const updated = await fetch(`/api/providers/${providerId}/availability`).then((r) => r.json());
    setAvailability(updated);
  }

  async function handleDeleteAvail(availId: string) {
    if (!providerId) return;
    await fetch(`/api/providers/${providerId}/availability/${availId}`, { method: "DELETE" });
    const updated = await fetch(`/api/providers/${providerId}/availability`).then((r) => r.json());
    setAvailability(updated);
  }

  if (status === "loading" || loading) return <div className="text-center py-16 text-gray-400">Loading…</div>;
  if (!session || session.user.role !== "PROVIDER") return null;

  const upcoming = appointments.filter((a) => a.status === "CONFIRMED" || a.status === "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Schedule</h1>
        <p className="text-gray-500 mt-1">{session.user.name}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["appointments", "availability"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 capitalize transition-colors
              ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-900"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {/* Appointments tab */}
      {tab === "appointments" && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800">Upcoming Appointments ({upcoming.length})</h2>
          {upcoming.length === 0 ? (
            <div className="text-gray-400 text-center py-8">No upcoming appointments.</div>
          ) : (
            upcoming.map((apt) => (
              <div key={apt.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{apt.service.name}</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">{apt.status}</span>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(apt.startsAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} (UTC)
                  &middot; {apt.service.durationMin} min
                </div>
                <div className="text-sm font-medium text-gray-700">Customer: {apt.customer.name}</div>
                <div className="text-xs text-gray-400">{apt.customer.email}</div>
                {apt.notes && <div className="text-xs text-gray-400 italic">{apt.notes}</div>}
              </div>
            ))
          )}
        </div>
      )}

      {/* Availability tab */}
      {tab === "availability" && (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800">Working Hours</h2>

          {availability.length === 0 ? (
            <p className="text-gray-400 text-sm">No availability defined yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availability.map((av) => (
                <div key={av.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <span className="font-medium">{DAYS[av.dayOfWeek]}</span>
                  <span className="text-gray-500">{av.startTime} – {av.endTime}</span>
                  <button onClick={() => handleDeleteAvail(av.id)} className="text-red-400 hover:text-red-600 ml-1 text-xs">Remove</button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Add Availability Block</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Day</label>
                <select
                  value={newAvail.dayOfWeek}
                  onChange={(e) => setNewAvail((p) => ({ ...p, dayOfWeek: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start</label>
                <input type="time" value={newAvail.startTime} onChange={(e) => setNewAvail((p) => ({ ...p, startTime: e.target.value }))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End</label>
                <input type="time" value={newAvail.endTime} onChange={(e) => setNewAvail((p) => ({ ...p, endTime: e.target.value }))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <button
                disabled={savingAvail}
                onClick={handleAddAvail}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {savingAvail ? "Saving…" : "+ Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
