"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session.user.role !== "ADMIN") router.push("/");
  }, [status, session, router]);

  if (status === "loading") return <div className="text-center py-16 text-gray-400">Loading…</div>;
  if (!session || session.user.role !== "ADMIN") return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Manage your ScheduleEasy system</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { href: "/admin/appointments", label: "Appointments", icon: "📅", desc: "View and manage all bookings" },
          { href: "/admin/services", label: "Services", icon: "✂️", desc: "Create and edit services" },
          { href: "/admin/providers", label: "Providers", icon: "👤", desc: "Manage staff and availability" },
          { href: "/admin/reports", label: "Reports", icon: "📊", desc: "Booking statistics" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-md transition-all group space-y-2"
          >
            <div className="text-3xl">{item.icon}</div>
            <div className="font-semibold text-gray-900 group-hover:text-blue-600">{item.label}</div>
            <div className="text-sm text-gray-500">{item.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
