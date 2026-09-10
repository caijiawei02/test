import nodemailer from "nodemailer";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

function createTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) {
    // Mock transport: log to console
    return nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    });
  }
  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || "587"),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail(payload: EmailPayload) {
  const from = process.env.SMTP_FROM || "ScheduleEasy <noreply@scheduleeasy.local>";

  if (!process.env.SMTP_HOST) {
    // Dev: just log
    console.log("📧 [MOCK EMAIL]");
    console.log(`  To:      ${payload.to}`);
    console.log(`  From:    ${from}`);
    console.log(`  Subject: ${payload.subject}`);
    console.log(`  Body:    (HTML)`);
    console.log(payload.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    return;
  }

  const transport = createTransport();
  await transport.sendMail({ from, ...payload });
}

// ─── Email templates ──────────────────────────────────────────────────────────

export function bookingConfirmationEmail(data: {
  customerName: string;
  serviceName: string;
  providerName: string;
  startsAt: Date;
  appointmentId: string;
}) {
  const dateStr = data.startsAt.toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "UTC",
  });
  return {
    subject: `Booking Confirmed — ${data.serviceName} on ${data.startsAt.toDateString()}`,
    html: `
      <h2>Your appointment is confirmed!</h2>
      <p>Hi ${data.customerName},</p>
      <p>Your booking details:</p>
      <ul>
        <li><strong>Service:</strong> ${data.serviceName}</li>
        <li><strong>Provider:</strong> ${data.providerName}</li>
        <li><strong>Date & Time:</strong> ${dateStr} (UTC)</li>
        <li><strong>Booking ID:</strong> ${data.appointmentId}</li>
      </ul>
      <p>To manage your booking, visit <a href="${process.env.NEXTAUTH_URL}/dashboard">your dashboard</a>.</p>
      <p>Thank you for choosing ScheduleEasy!</p>
    `,
  };
}

export function cancellationEmail(data: {
  customerName: string;
  serviceName: string;
  providerName: string;
  startsAt: Date;
  appointmentId: string;
}) {
  const dateStr = data.startsAt.toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "UTC",
  });
  return {
    subject: `Appointment Cancelled — ${data.serviceName}`,
    html: `
      <h2>Appointment Cancelled</h2>
      <p>Hi ${data.customerName},</p>
      <p>Your appointment has been cancelled:</p>
      <ul>
        <li><strong>Service:</strong> ${data.serviceName}</li>
        <li><strong>Provider:</strong> ${data.providerName}</li>
        <li><strong>Original Date:</strong> ${dateStr} (UTC)</li>
        <li><strong>Booking ID:</strong> ${data.appointmentId}</li>
      </ul>
      <p>We hope to see you again. <a href="${process.env.NEXTAUTH_URL}/book">Book a new appointment</a>.</p>
    `,
  };
}

export function rescheduleEmail(data: {
  customerName: string;
  serviceName: string;
  providerName: string;
  oldStartsAt: Date;
  newStartsAt: Date;
  appointmentId: string;
}) {
  const oldDate = data.oldStartsAt.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" });
  const newDate = data.newStartsAt.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" });
  return {
    subject: `Appointment Rescheduled — ${data.serviceName}`,
    html: `
      <h2>Appointment Rescheduled</h2>
      <p>Hi ${data.customerName},</p>
      <p>Your appointment has been rescheduled:</p>
      <ul>
        <li><strong>Service:</strong> ${data.serviceName}</li>
        <li><strong>Provider:</strong> ${data.providerName}</li>
        <li><strong>Previous Date:</strong> ${oldDate} (UTC)</li>
        <li><strong>New Date:</strong> ${newDate} (UTC)</li>
        <li><strong>New Booking ID:</strong> ${data.appointmentId}</li>
      </ul>
      <p>To manage your booking, visit <a href="${process.env.NEXTAUTH_URL}/dashboard">your dashboard</a>.</p>
    `,
  };
}

export function reminderEmail(data: {
  customerName: string;
  serviceName: string;
  providerName: string;
  startsAt: Date;
  appointmentId: string;
}) {
  const dateStr = data.startsAt.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" });
  return {
    subject: `Reminder: ${data.serviceName} tomorrow`,
    html: `
      <h2>Appointment Reminder</h2>
      <p>Hi ${data.customerName},</p>
      <p>This is a reminder that you have an upcoming appointment:</p>
      <ul>
        <li><strong>Service:</strong> ${data.serviceName}</li>
        <li><strong>Provider:</strong> ${data.providerName}</li>
        <li><strong>Date & Time:</strong> ${dateStr} (UTC)</li>
        <li><strong>Booking ID:</strong> ${data.appointmentId}</li>
      </ul>
      <p>To manage your booking, visit <a href="${process.env.NEXTAUTH_URL}/dashboard">your dashboard</a>.</p>
    `,
  };
}
