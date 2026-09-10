import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/providers/[id]/availability
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const avails = await prisma.availability.findMany({
    where: { providerId: id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json(avails);
}

// POST /api/providers/[id]/availability — provider or admin
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Only the provider themselves or an admin can manage availability
  if (session.user.role !== "ADMIN") {
    const provider = await prisma.provider.findUnique({ where: { id } });
    if (!provider || provider.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json();
  const { dayOfWeek, startTime, endTime } = body;

  if (dayOfWeek === undefined || !startTime || !endTime) {
    return NextResponse.json({ error: "dayOfWeek, startTime, endTime required" }, { status: 400 });
  }

  const avail = await prisma.availability.create({
    data: { providerId: id, dayOfWeek: Number(dayOfWeek), startTime, endTime },
  });
  return NextResponse.json(avail, { status: 201 });
}
