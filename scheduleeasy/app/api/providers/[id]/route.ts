import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/providers/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { bio, active, serviceIds } = body;

  const provider = await prisma.$transaction(async (tx) => {
    const prov = await tx.provider.update({
      where: { id },
      data: {
        ...(bio !== undefined && { bio }),
        ...(active !== undefined && { active }),
      },
    });

    if (serviceIds !== undefined) {
      await tx.providerService.deleteMany({ where: { providerId: id } });
      if (serviceIds.length > 0) {
        await tx.providerService.createMany({
          data: serviceIds.map((sid: string) => ({ providerId: id, serviceId: sid })),
        });
      }
    }

    return prov;
  });

  return NextResponse.json(provider);
}

// DELETE — deactivate provider
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.provider.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
