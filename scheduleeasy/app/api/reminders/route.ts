import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { sendEmail, reminderEmail } from "@/lib/email";

// POST /api/reminders — intended to be called by a cron job or scheduled task
// For demo: call GET /api/reminders to trigger the check
export async function GET() {
  const session = await auth();
  // Allow unauthenticated for cron-style calls, but protect with a simple token check
  // In production, secure this endpoint properly.

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  // Find appointments 24-25 hours from now that haven't been reminded
  const appointments = await prisma.appointment.findMany({
    where: {
      status: "CONFIRMED",
      reminderSent: false,
      startsAt: { gte: in24h, lte: in25h },
    },
    include: {
      customer: { select: { name: true, email: true } },
      provider: { include: { user: { select: { name: true } } } },
      service: true,
    },
  });

  const results: string[] = [];

  for (const apt of appointments) {
    try {
      await sendEmail({
        to: apt.customer.email,
        ...reminderEmail({
          customerName: apt.customer.name,
          serviceName: apt.service.name,
          providerName: apt.provider.user.name,
          startsAt: apt.startsAt,
          appointmentId: apt.id,
        }),
      });

      await prisma.appointment.update({
        where: { id: apt.id },
        data: { reminderSent: true },
      });

      await writeAuditLog({
        appointmentId: apt.id,
        actorId: undefined,
        actorRole: "SYSTEM",
        eventType: "REMINDER_SENT",
        afterState: { sentAt: new Date().toISOString(), to: apt.customer.email },
      });

      results.push(apt.id);
    } catch (err) {
      console.error(`Failed to send reminder for ${apt.id}`, err);
    }
  }

  return NextResponse.json({ processed: results.length, ids: results });
}
