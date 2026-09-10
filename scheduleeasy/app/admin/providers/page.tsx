"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Service = { id: string; name: string };
type Provider = {
  id: string;
  bio: string | null;
  active: boolean;
  user: { id: string; name: string; email: string };
  services: Array<{ service: Service }>;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AdminProvidersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", bio: "", serviceIds: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Record<string, Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string }>>>({});
  const [newAvail, setNewAvail] = useState({ dayOfWeek: "1", startTime: "09:00", endTime: "17:00" });
  const [savingAvail, setSavingAvail] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session.user.role !== "ADMIN") router.push("/");
  }, [status, session, router]);

  function loadProviders() {
    fetch("/api/providers").then((r) => r.json()).then(setProviders).finally(() => setLoading(false));
  }

  useEffect(() => {
    if (status === "authenticated") {
      loadProviders();
      fetch("/api/services").then((r) => r.json()).then(setServices);
    }
  }, [status]);

  async function handleCreate() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return; }
    setShowForm(false);
    setForm({ name: "", email: "", password: "", bio: "", serviceIds: [] });
    loadProviders();
  }

  async function handleToggle(id: string, active: boolean) {
    await fetch(`/api/providers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    loadProviders();
  }

  async function loadAvailability(providerId: string) {
    if (availability[providerId]) return;
    const data = await fetch(`/api/providers/${providerId}/availability`).then((r) => r.json());
    setAvailability((prev) => ({ ...prev, [providerId]: data }));
  }

  async function handleAddAvail(providerId: string) {
    setSavingAvail(true);
    await fetch(`/api/providers/${providerId}/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayOfWeek: Number(newAvail.dayOfWeek), startTime: newAvail.startTime, endTime: newAvail.endTime }),
    });
    setSavingAvail(false);
    const data = await fetch(`/api/providers/${providerId}/availability`).then((r) => r.json());
    setAvailability((prev) => ({ ...prev, [providerId]: data }));
  }

  async function handleDeleteAvail(providerId: string, availId: string) {
    await fetch(`/api/providers/${providerId}/availability/${availId}`, { method: "DELETE" });
    const data = await fetch(`/api/providers/${providerId}/availability`).then((r) => r.json());
    setAvailability((prev) => ({ ...prev, [providerId]: data }));
  }

  if (!session || session.user.role !== "ADMIN") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm text-blue-600 hover:underline">← Admin</Link>
          <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(""); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Add Provider
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4 max-w-lg">
          <h2 className="font-semibold text-blue-900">New Provider</h2>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {[
            { label: "Full Name", key: "name", type: "text" },
            { label: "Email", key: "email", type: "email" },
            { label: "Password", key: "password", type: "password" },
            { label: "Bio (optional)", key: "bio", type: "text" },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input
                type={f.type}
                value={form[f.key as keyof typeof form] as string}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Services</label>
            <div className="flex flex-wrap gap-2">
              {services.map((svc) => (
                <label key={svc.id} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={form.serviceIds.includes(svc.id)}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        serviceIds: e.target.checked
                          ? [...p.serviceIds, svc.id]
                          : p.serviceIds.filter((id) => id !== svc.id),
                      }))
                    }
                  />
                  {svc.name}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button disabled={saving} onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Creating…" : "Create Provider"}
            </button>
            <button onClick={() => setShowForm(false)} className="text-gray-600 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Provider list */}
      {loading ? (
        <div className="text-gray-400 text-center py-8">Loading…</div>
      ) : (
        <div className="space-y-3">
          {providers.map((prov) => (
            <div key={prov.id} className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${!prov.active ? "opacity-60" : ""}`}>
              <div className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="font-semibold text-gray-900">{prov.user.name}</div>
                  <div className="text-sm text-gray-500">{prov.user.email}</div>
                  {prov.bio && <div className="text-xs text-gray-400 mt-1">{prov.bio}</div>}
                  <div className="text-xs text-gray-400 mt-1">
                    Services: {prov.services.length > 0 ? prov.services.map((s) => s.service.name).join(", ") : "None"}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prov.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                    {prov.active ? "Active" : "Inactive"}
                  </span>
                  <button
                    onClick={() => { handleToggle(prov.id, !prov.active); }}
                    className={`text-xs border px-2 py-1 rounded ${prov.active ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}
                  >
                    {prov.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => {
                      if (expandedId === prov.id) { setExpandedId(null); } else {
                        setExpandedId(prov.id);
                        loadAvailability(prov.id);
                      }
                    }}
                    className="text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-50"
                  >
                    {expandedId === prov.id ? "Hide" : "Availability"}
                  </button>
                </div>
              </div>

              {/* Availability panel */}
              {expandedId === prov.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">Availability Blocks</h3>
                  {(availability[prov.id] || []).length === 0 ? (
                    <p className="text-sm text-gray-400">No availability defined.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(availability[prov.id] || []).map((av) => (
                        <div key={av.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs">
                          <span className="font-medium">{DAYS[av.dayOfWeek]}</span>
                          <span className="text-gray-500">{av.startTime}–{av.endTime}</span>
                          <button onClick={() => handleDeleteAvail(prov.id, av.id)} className="text-red-400 hover:text-red-600 ml-1">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Add availability */}
                  <div className="flex flex-wrap gap-2 items-end">
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Day</label>
                      <select
                        value={newAvail.dayOfWeek}
                        onChange={(e) => setNewAvail((p) => ({ ...p, dayOfWeek: e.target.value }))}
                        className="border border-gray-300 rounded px-2 py-1 text-xs"
                      >
                        {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Start</label>
                      <input type="time" value={newAvail.startTime} onChange={(e) => setNewAvail((p) => ({ ...p, startTime: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 text-xs" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">End</label>
                      <input type="time" value={newAvail.endTime} onChange={(e) => setNewAvail((p) => ({ ...p, endTime: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 text-xs" />
                    </div>
                    <button
                      disabled={savingAvail}
                      onClick={() => handleAddAvail(prov.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
