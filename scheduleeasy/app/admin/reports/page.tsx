"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ReportData = {
  byDay: Record<string, number>;
  byService: Record<string, number>;
  byProvider: Record<string, number>;
};

export default function AdminReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session.user.role !== "ADMIN") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/reports")
        .then((r) => r.json())
        .then(setData)
        .finally(() => setLoading(false));
    }
  }, [status]);

  if (!session || session.user.role !== "ADMIN") return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">← Admin</Link>
        <h1 className="text-2xl font-bold text-gray-900">Reports (Last 30 Days)</h1>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-8">Loading…</div>
      ) : !data ? (
        <div className="text-gray-400 text-center py-8">No data.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ReportCard title="Bookings by Day" data={data.byDay} />
          <ReportCard title="Bookings by Service" data={data.byService} />
          <ReportCard title="Bookings by Provider" data={data.byProvider} />
        </div>
      )}
    </div>
  );
}

function ReportCard({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  const max = entries[0]?.[1] || 1;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <div className="text-2xl font-bold text-blue-600 mt-1">{total}</div>
        <div className="text-xs text-gray-400">total appointments</div>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-400">No data yet.</p>
      ) : (
        <ul className="space-y-2">
          {entries.slice(0, 10).map(([key, count]) => (
            <li key={key} className="space-y-0.5">
              <div className="flex justify-between text-xs text-gray-600">
                <span className="truncate">{key}</span>
                <span className="font-medium ml-2">{count}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
