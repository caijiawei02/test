"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function NavBar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = session?.user?.role;

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-bold text-xl text-blue-600 tracking-tight">
          ScheduleEasy
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/book" className="text-gray-600 hover:text-blue-600 transition-colors">
            Book Now
          </Link>

          {session ? (
            <>
              {role === "ADMIN" && (
                <Link href="/admin" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Admin
                </Link>
              )}
              {role === "PROVIDER" && (
                <Link href="/provider" className="text-gray-600 hover:text-blue-600 transition-colors">
                  My Schedule
                </Link>
              )}
              {role === "CUSTOMER" && (
                <Link href="/dashboard" className="text-gray-600 hover:text-blue-600 transition-colors">
                  My Appointments
                </Link>
              )}
              <span className="text-gray-400">|</span>
              <span className="text-gray-500">{session.user.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-gray-600 hover:text-red-600 transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-600 hover:text-blue-600 transition-colors">
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-blue-600 text-white px-4 py-1.5 rounded-full hover:bg-blue-700 transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded text-gray-600 hover:bg-gray-100"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-3 text-sm font-medium">
          <Link href="/book" onClick={() => setMenuOpen(false)} className="text-gray-700">
            Book Now
          </Link>
          {session ? (
            <>
              {role === "ADMIN" && (
                <Link href="/admin" onClick={() => setMenuOpen(false)} className="text-gray-700">
                  Admin
                </Link>
              )}
              {role === "PROVIDER" && (
                <Link href="/provider" onClick={() => setMenuOpen(false)} className="text-gray-700">
                  My Schedule
                </Link>
              )}
              {role === "CUSTOMER" && (
                <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="text-gray-700">
                  My Appointments
                </Link>
              )}
              <span className="text-gray-400 text-xs">{session.user.email}</span>
              <button
                onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                className="text-red-600 text-left"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)} className="text-gray-700">
                Sign In
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} className="text-blue-600 font-semibold">
                Sign Up Free
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
