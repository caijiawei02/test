import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import SessionProvider from "@/components/SessionProvider";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "ScheduleEasy — Book Appointments Online",
  description: "Find, book, and manage appointments with ease.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <SessionProvider session={session}>
          <NavBar />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
