import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/providers/[id]/availability/[availId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; availId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, availId } = await params;

  if (session.user.role !== "ADMIN") {
    const provider = await prisma.provider.findUnique({ where: { id } });
    if (!provider || provider.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await prisma.availability.delete({ where: { id: availId } });
  return NextResponse.json({ ok: true });
}
