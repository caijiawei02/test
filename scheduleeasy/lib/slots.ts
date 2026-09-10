import { prisma } from "@/lib/prisma";

/**
 * Given a providerId, serviceId, and a calendar date (YYYY-MM-DD),
 * returns available UTC slot start times as ISO strings.
 *
 * Algorithm:
 *  1. Find the provider's availability for that day-of-week.
 *  2. Generate all candidate slots (start = avail.startTime, step = durationMin).
 *  3. Exclude slots that overlap any existing CONFIRMED appointment.
 */
export async function getAvailableSlots(
  providerId: string,
  serviceId: string,
  dateStr: string // "YYYY-MM-DD"
): Promise<string[]> {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) return [];

  // Parse date in UTC
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay(); // 0=Sun … 6=Sat

  const avails = await prisma.availability.findMany({
    where: { providerId, dayOfWeek, active: true },
  });
  if (avails.length === 0) return [];

  const durationMs = service.durationMin * 60 * 1000;
  const candidateSlots: Date[] = [];

  for (const avail of avails) {
    const [startH, startM] = avail.startTime.split(":").map(Number);
    const [endH, endM] = avail.endTime.split(":").map(Number);

    const windowStart = Date.UTC(year, month - 1, day, startH, startM);
    const windowEnd = Date.UTC(year, month - 1, day, endH, endM);

    for (let t = windowStart; t + durationMs <= windowEnd; t += durationMs) {
      candidateSlots.push(new Date(t));
    }
  }

  if (candidateSlots.length === 0) return [];

  // Load existing appointments for this provider on this day
  const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

  const existing = await prisma.appointment.findMany({
    where: {
      providerId,
      status: { in: ["CONFIRMED", "PENDING"] },
      startsAt: { gte: dayStart, lte: dayEnd },
    },
  });

  // Filter out slots that overlap existing appointments
  const available = candidateSlots.filter((slot) => {
    const slotEnd = new Date(slot.getTime() + durationMs);
    return !existing.some((apt) => {
      // Overlap check: slot starts before apt ends AND slot ends after apt starts
      return slot < apt.endsAt && slotEnd > apt.startsAt;
    });
  });

  return available.map((d) => d.toISOString());
}
