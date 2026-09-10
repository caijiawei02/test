import Link from "next/link";
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="flex flex-col items-center text-center gap-8 py-16">
      {/* Hero */}
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900">
          Book appointments <span className="text-blue-600">effortlessly</span>
        </h1>
        <p className="text-xl text-gray-500">
          ScheduleEasy helps you find the right provider, pick a time that works,
          and get confirmed — all in under a minute.
        </p>
      </div>

      {/* CTA buttons */}
      <div className="flex flex-wrap gap-4 justify-center">
        <Link
          href="/book"
          className="bg-blue-600 text-white px-8 py-3 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow"
        >
          Book an Appointment
        </Link>
        {!session && (
          <Link
            href="/register"
            className="border border-gray-300 text-gray-700 px-8 py-3 rounded-xl text-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Create Account
          </Link>
        )}
        {session?.user?.role === "ADMIN" && (
          <Link
            href="/admin"
            className="border border-blue-300 text-blue-700 px-8 py-3 rounded-xl text-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Admin Dashboard
          </Link>
        )}
        {session?.user?.role === "PROVIDER" && (
          <Link
            href="/provider"
            className="border border-blue-300 text-blue-700 px-8 py-3 rounded-xl text-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            My Schedule
          </Link>
        )}
        {session?.user?.role === "CUSTOMER" && (
          <Link
            href="/dashboard"
            className="border border-blue-300 text-blue-700 px-8 py-3 rounded-xl text-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            My Appointments
          </Link>
        )}
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl mt-8">
        {[
          {
            icon: "📅",
            title: "Real-time Availability",
            desc: "See open slots instantly based on provider schedules.",
          },
          {
            icon: "✉️",
            title: "Email Confirmations",
            desc: "Get confirmed immediately and reminded before your appointment.",
          },
          {
            icon: "🔄",
            title: "Easy Rescheduling",
            desc: "Life happens. Cancel or reschedule with a single click.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-left space-y-2"
          >
            <div className="text-3xl">{f.icon}</div>
            <h3 className="font-semibold text-gray-900">{f.title}</h3>
            <p className="text-sm text-gray-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
