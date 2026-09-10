import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { sendEmail, bookingConfirmationEmail } from "@/lib/email";

// GET /api/appointments — customer sees own, admin/provider sees all/theirs
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const serviceId = searchParams.get("serviceId");
  const providerIdQ = searchParams.get("providerId");

  const role = session.user.role;

  // Build where clause based on role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    ...(dateFrom && { startsAt: { gte: new Date(dateFrom) } }),
    ...(dateTo && { startsAt: { lte: new Date(dateTo) } }),
    ...(serviceId && { serviceId }),
  };

  if (role === "CUSTOMER") {
    where.customerId = session.user.id;
  } else if (role === "PROVIDER") {
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
    });
    if (!provider) return NextResponse.json([]);
    where.providerId = providerIdQ || provider.id;
  } else if (role === "ADMIN" && providerIdQ) {
    where.providerId = providerIdQ;
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, email: true } },
      provider: { include: { user: { select: { name: true } } } },
      service: true,
    },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json(appointments);
}

// POST /api/appointments — book an appointment
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { providerId, serviceId, startsAt, notes } = body;

  if (!providerId || !serviceId || !startsAt) {
    return NextResponse.json(
      { error: "providerId, serviceId, startsAt required" },
      { status: 400 }
    );
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) {
    return NextResponse.json({ error: "Service not found or inactive" }, { status: 404 });
  }

  const startDate = new Date(startsAt);
  const endDate = new Date(startDate.getTime() + service.durationMin * 60 * 1000);

  // Double-booking prevention via a serialized transaction
  const appointment = await prisma.$transaction(async (tx) => {
    // Lock check: any overlapping confirmed appointment for this provider
    const conflict = await tx.appointment.findFirst({
      where: {
        providerId,
        status: { in: ["CONFIRMED", "PENDING"] },
        AND: [
          { startsAt: { lt: endDate } },
          { endsAt: { gt: startDate } },
        ],
      },
    });

    if (conflict) {
      throw new Error("SLOT_TAKEN");
    }

    return tx.appointment.create({
      data: {
        customerId: session.user.id,
        providerId,
        serviceId,
        startsAt: startDate,
        endsAt: endDate,
        status: "CONFIRMED",
        notes: notes || null,
      },
      include: {
        customer: { select: { name: true, email: true } },
        provider: { include: { user: { select: { name: true } } } },
        service: true,
      },
    });
  });

  // Audit log
  await writeAuditLog({
    appointmentId: appointment.id,
    actorId: session.user.id,
    actorRole: session.user.role,
    eventType: "CREATED",
    afterState: {
      status: appointment.status,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
    },
  });

  // Send confirmation email (non-blocking)
  sendEmail({
    to: appointment.customer.email,
    ...bookingConfirmationEmail({
      customerName: appointment.customer.name,
      serviceName: appointment.service.name,
      providerName: appointment.provider.user.name,
      startsAt: appointment.startsAt,
      appointmentId: appointment.id,
    }),
  }).catch(console.error);

  return NextResponse.json(appointment, { status: 201 });
}
