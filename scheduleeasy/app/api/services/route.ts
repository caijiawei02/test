import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/services — public list of active services
export async function GET() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      providers: {
        include: {
          provider: { include: { user: { select: { name: true } } } },
        },
        where: { provider: { active: true } },
      },
    },
  });
  return NextResponse.json(services);
}

// POST /api/services — admin only
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, durationMin } = body;
  if (!name || !durationMin) {
    return NextResponse.json({ error: "name and durationMin required" }, { status: 400 });
  }

  const service = await prisma.service.create({
    data: { name, description, durationMin: Number(durationMin) },
  });
  return NextResponse.json(service, { status: 201 });
}
