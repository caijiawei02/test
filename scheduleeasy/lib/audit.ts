import { prisma } from "@/lib/prisma";

type EventType = "CREATED" | "RESCHEDULED" | "CANCELLED" | "STATUS_CHANGED" | "REMINDER_SENT";

export async function writeAuditLog(params: {
  appointmentId: string;
  actorId?: string;
  actorRole?: string;
  eventType: EventType;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      appointmentId: params.appointmentId,
      actorId: params.actorId ?? null,
      actorRole: params.actorRole ?? null,
      eventType: params.eventType,
      beforeState: params.beforeState ? JSON.stringify(params.beforeState) : null,
      afterState: params.afterState ? JSON.stringify(params.afterState) : null,
    },
  });
}
