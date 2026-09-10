import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/reports — admin only
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Appointments by day (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const appointments = await prisma.appointment.findMany({
    where: { startsAt: { gte: thirtyDaysAgo } },
    include: {
      service: { select: { name: true } },
      provider: { include: { user: { select: { name: true } } } },
    },
    orderBy: { startsAt: "asc" },
  });

  // Group by day
  const byDay: Record<string, number> = {};
  const byService: Record<string, number> = {};
  const byProvider: Record<string, number> = {};

  for (const apt of appointments) {
    if (apt.status === "CANCELLED") continue;

    const day = apt.startsAt.toISOString().slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;

    const svc = apt.service.name;
    byService[svc] = (byService[svc] || 0) + 1;

    const prov = apt.provider.user.name;
    byProvider[prov] = (byProvider[prov] || 0) + 1;
  }

  return NextResponse.json({ byDay, byService, byProvider });
}
