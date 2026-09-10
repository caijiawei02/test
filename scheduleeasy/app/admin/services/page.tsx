"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Service = { id: string; name: string; description: string | null; durationMin: number; active: boolean };

export default function AdminServicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", durationMin: "30" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session.user.role !== "ADMIN") router.push("/");
  }, [status, session, router]);

  function loadServices() {
    fetch("/api/services")
      .then((r) => r.json())
      .then(setServices)
      .finally(() => setLoading(false));
  }

  useEffect(() => { if (status === "authenticated") loadServices(); }, [status]);

  function startEdit(svc: Service) {
    setEditId(svc.id);
    setForm({ name: svc.name, description: svc.description || "", durationMin: String(svc.durationMin) });
    setShowForm(true);
    setError("");
  }

  function startCreate() {
    setEditId(null);
    setForm({ name: "", description: "", durationMin: "30" });
    setShowForm(true);
    setError("");
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const body = { name: form.name, description: form.description, durationMin: Number(form.durationMin) };
    const res = editId
      ? await fetch(`/api/services/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return; }
    setShowForm(false);
    loadServices();
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this service?")) return;
    await fetch(`/api/services/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: false }) });
    loadServices();
  }

  async function handleActivate(id: string) {
    await fetch(`/api/services/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: true }) });
    loadServices();
  }

  if (!session || session.user.role !== "ADMIN") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm text-blue-600 hover:underline">← Admin</Link>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
        </div>
        <button
          onClick={startCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Add Service
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4 max-w-lg">
          <h2 className="font-semibold text-blue-900">{editId ? "Edit Service" : "New Service"}</h2>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {[
            { label: "Name", key: "name", type: "text", placeholder: "e.g. Haircut" },
            { label: "Description", key: "description", type: "text", placeholder: "Short description" },
            { label: "Duration (minutes)", key: "durationMin", type: "number", placeholder: "30" },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input
                type={f.type}
                value={form[f.key as keyof typeof form]}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          <div className="flex gap-3">
            <button disabled={saving} onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setShowForm(false)} className="text-gray-600 text-sm hover:text-gray-900">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-gray-400 text-center py-8">Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-white border border-gray-200 rounded-xl overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200 text-left">
              <tr>
                {["Name", "Description", "Duration", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {services.map((svc) => (
                <tr key={svc.id} className={`hover:bg-gray-50 ${!svc.active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium">{svc.name}</td>
                  <td className="px-4 py-3 text-gray-500">{svc.description || "—"}</td>
                  <td className="px-4 py-3">{svc.durationMin} min</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${svc.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                      {svc.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => startEdit(svc)} className="text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-50">Edit</button>
                    {svc.active ? (
                      <button onClick={() => handleDeactivate(svc.id)} className="text-xs text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50">Deactivate</button>
                    ) : (
                      <button onClick={() => handleActivate(svc.id)} className="text-xs text-green-600 border border-green-200 px-2 py-1 rounded hover:bg-green-50">Activate</button>
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
