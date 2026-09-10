import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/providers
export async function GET() {
  const providers = await prisma.provider.findMany({
    where: { active: true },
    include: {
      user: { select: { id: true, name: true, email: true } },
      services: { include: { service: true } },
    },
    orderBy: { user: { name: "asc" } },
  });
  return NextResponse.json(providers);
}

// POST /api/providers — admin creates a new provider (creates user + provider)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, bio, serviceIds } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email, password required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const provider = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash, role: "PROVIDER" },
    });
    const prov = await tx.provider.create({
      data: {
        userId: user.id,
        bio: bio || null,
        ...(serviceIds?.length
          ? { services: { create: serviceIds.map((sid: string) => ({ serviceId: sid })) } }
          : {}),
      },
      include: { user: { select: { id: true, name: true, email: true } }, services: true },
    });
    return prov;
  });

  return NextResponse.json(provider, { status: 201 });
}
