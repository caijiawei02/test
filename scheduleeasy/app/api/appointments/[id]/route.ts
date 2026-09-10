import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { sendEmail, cancellationEmail, rescheduleEmail } from "@/lib/email";

// GET /api/appointments/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      provider: { include: { user: { select: { name: true } } } },
      service: true,
      auditLogs: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Access control
  const role = session.user.role;
  if (
    role === "CUSTOMER" && appointment.customerId !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(appointment);
}

// PATCH /api/appointments/[id] — cancel or reschedule
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action, newStartsAt } = body; // action: "cancel" | "reschedule"

  const existing = await prisma.appointment.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, email: true } },
      provider: { include: { user: { select: { name: true } } } },
      service: true,
    },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Authorization: customer can only modify their own; provider can view; admin can do anything
  const role = session.user.role;
  if (role === "CUSTOMER" && existing.customerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (role === "PROVIDER") {
    const prov = await prisma.provider.findUnique({ where: { userId: session.user.id } });
    if (!prov || prov.id !== existing.providerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (existing.status === "CANCELLED") {
    return NextResponse.json({ error: "Appointment already cancelled" }, { status: 400 });
  }

  const beforeState = {
    status: existing.status,
    startsAt: existing.startsAt,
    endsAt: existing.endsAt,
  };

  if (action === "cancel") {
    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    await writeAuditLog({
      appointmentId: id,
      actorId: session.user.id,
      actorRole: role,
      eventType: "CANCELLED",
      beforeState,
      afterState: { status: "CANCELLED" },
    });

    sendEmail({
      to: existing.customer.email,
      ...cancellationEmail({
        customerName: existing.customer.name,
        serviceName: existing.service.name,
        providerName: existing.provider.user.name,
        startsAt: existing.startsAt,
        appointmentId: id,
      }),
    }).catch(console.error);

    return NextResponse.json(updated);
  }

  if (action === "reschedule") {
    if (!newStartsAt) {
      return NextResponse.json({ error: "newStartsAt required for reschedule" }, { status: 400 });
    }

    const newStart = new Date(newStartsAt);
    const newEnd = new Date(newStart.getTime() + existing.service.durationMin * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      // Double-booking check for new slot
      const conflict = await tx.appointment.findFirst({
        where: {
          providerId: existing.providerId,
          status: { in: ["CONFIRMED", "PENDING"] },
          id: { not: id }, // exclude current appointment
          AND: [
            { startsAt: { lt: newEnd } },
            { endsAt: { gt: newStart } },
          ],
        },
      });

      if (conflict) throw new Error("SLOT_TAKEN");

      // Mark old as rescheduled
      await tx.appointment.update({
        where: { id },
        data: { status: "RESCHEDULED" },
      });

      // Create new appointment
      return tx.appointment.create({
        data: {
          customerId: existing.customerId,
          providerId: existing.providerId,
          serviceId: existing.serviceId,
          startsAt: newStart,
          endsAt: newEnd,
          status: "CONFIRMED",
          rescheduledFromId: id,
          notes: existing.notes,
        },
        include: {
          customer: { select: { name: true, email: true } },
          provider: { include: { user: { select: { name: true } } } },
          service: true,
        },
      });
    });

    await Promise.all([
      writeAuditLog({
        appointmentId: id,
        actorId: session.user.id,
        actorRole: role,
        eventType: "RESCHEDULED",
        beforeState,
        afterState: { status: "RESCHEDULED", newAppointmentId: result.id },
      }),
      writeAuditLog({
        appointmentId: result.id,
        actorId: session.user.id,
        actorRole: role,
        eventType: "CREATED",
        afterState: {
          status: result.status,
          startsAt: result.startsAt,
          endsAt: result.endsAt,
          rescheduledFromId: id,
        },
      }),
    ]);

    sendEmail({
      to: result.customer.email,
      ...rescheduleEmail({
        customerName: result.customer.name,
        serviceName: result.service.name,
        providerName: result.provider.user.name,
        oldStartsAt: existing.startsAt,
        newStartsAt: result.startsAt,
        appointmentId: result.id,
      }),
    }).catch(console.error);

    return NextResponse.json(result, { status: 201 });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
