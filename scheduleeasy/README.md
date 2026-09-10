# ScheduleEasy

A web-based appointment scheduling system for service businesses. Built with **Next.js 16**, **Prisma 7** (SQLite), **NextAuth.js v5**, and **Tailwind CSS 4**.

---

## Features

| Area | Details |
|---|---|
| **Authentication** | Email + password login/register; roles: Customer, Provider, Admin |
| **Booking flow** | Multi-step: choose service → provider → date/time slot → confirm |
| **Availability** | Provider working-hours blocks; slots computed from availability − existing bookings |
| **Double-booking prevention** | Server-side transaction lock on every booking/reschedule |
| **Cancel & Reschedule** | Customers (and admins) can cancel or reschedule; audit log updated |
| **Email notifications** | Confirmation, cancellation, reschedule, 24h reminder (mock logger in dev; SMTP in prod) |
| **Admin dashboard** | Manage services, providers, availability; view all appointments; booking reports |
| **Provider dashboard** | View upcoming appointments, manage own availability |
| **Audit log** | Every appointment lifecycle event is recorded with actor, before/after state |
| **Mobile responsive** | Tailwind CSS, works on desktop/tablet/mobile |

---

## Quick Start (local dev)

### Prerequisites

- [Docker](https://www.docker.com/) (used to run Node.js — no local Node required)
- OR Node.js 20+ with npm

### 1. Clone / enter the project

```bash
cd scheduleeasy
```

### 2. Install dependencies

```bash
# With Docker (no local Node needed):
docker run --rm -v "$PWD":/workspace -w /workspace node:20 npm install

# Or with local Node:
npm install
```

### 3. Configure environment

Copy `.env` is already pre-configured for local dev with SQLite:

```
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="scheduleeasy-dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Leave SMTP_HOST blank to use console/mock email logging
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="ScheduleEasy <noreply@scheduleeasy.local>"
```

### 4. Run database migration

```bash
# With Docker:
docker run --rm -v "$PWD":/workspace -w /workspace node:20 npx prisma migrate dev

# Or locally:
npx prisma migrate dev
```

### 5. Seed demo data

```bash
# With Docker:
docker run --rm -v "$PWD":/workspace -w /workspace -e DATABASE_URL="file:./dev.db" node:20 npx tsx prisma/seed.ts

# Or locally:
DATABASE_URL="file:./dev.db" npx tsx prisma/seed.ts
```

### 6. Start the dev server

```bash
# With Docker (exposes port 3000):
docker run --rm -v "$PWD":/workspace -w /workspace -p 3000:3000 -e DATABASE_URL="file:./dev.db" -e NEXTAUTH_URL="http://localhost:3000" -e NEXTAUTH_SECRET="scheduleeasy-dev-secret-change-in-production" node:20 npm run dev

# Or locally:
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@scheduleeasy.local` | `admin1234` |
| Provider | `alice@scheduleeasy.local` | `provider1234` |
| Provider | `bob@scheduleeasy.local` | `provider1234` |
| Customer | `jane@example.com` | `customer1234` |

---

## Pages

| URL | Description |
|---|---|
| `/` | Home / landing page |
| `/register` | Customer self-registration |
| `/login` | Sign in |
| `/book` | Multi-step booking flow (public; login required at confirm step) |
| `/dashboard` | Customer: view/cancel/reschedule appointments |
| `/provider` | Provider: view schedule, manage availability |
| `/admin` | Admin home |
| `/admin/appointments` | View and cancel all appointments |
| `/admin/services` | CRUD services |
| `/admin/providers` | CRUD providers + availability management |
| `/admin/reports` | Booking counts by day / service / provider |

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/register` | Public | Register a new customer |
| `GET` | `/api/services` | Public | List active services |
| `POST` | `/api/services` | Admin | Create service |
| `PATCH` | `/api/services/[id]` | Admin | Update/deactivate service |
| `GET` | `/api/providers` | Public | List active providers |
| `POST` | `/api/providers` | Admin | Create provider + user |
| `PATCH` | `/api/providers/[id]` | Admin | Update/deactivate provider |
| `GET` | `/api/providers/[id]/availability` | Public | Get availability blocks |
| `POST` | `/api/providers/[id]/availability` | Provider/Admin | Add availability block |
| `DELETE` | `/api/providers/[id]/availability/[availId]` | Provider/Admin | Remove availability block |
| `GET` | `/api/slots` | Public | Get available time slots |
| `GET` | `/api/appointments` | Auth | List appointments (scoped by role) |
| `POST` | `/api/appointments` | Auth | Book an appointment |
| `GET` | `/api/appointments/[id]` | Auth | Get single appointment |
| `PATCH` | `/api/appointments/[id]` | Auth | Cancel or reschedule |
| `GET` | `/api/reports` | Admin | Booking statistics |
| `GET` | `/api/reminders` | System | Trigger 24h reminder emails |

---

## Email in Production

Set these env vars to enable real SMTP:

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM="ScheduleEasy <noreply@yourdomain.com>"
```

In dev (with `SMTP_HOST` unset), all emails are printed to the console.

---

## Reminders Cron

Call `GET /api/reminders` on a schedule (e.g. hourly) to send 24h-ahead reminder emails.

Example with cURL:
```bash
curl http://localhost:3000/api/reminders
```

In production, use a cron job, GitHub Actions scheduled workflow, or a service like Vercel Cron.

---

## Architecture Notes

- **UTC throughout**: All `startsAt`/`endsAt` stored in UTC. Frontend displays in browser locale or UTC.
- **Double-booking**: Uses a Prisma `$transaction` with an overlap query before insert.
- **Audit log**: Every appointment lifecycle event writes to `AuditLog` with actor, role, and before/after JSON.
- **Prisma v7 + libsql**: Uses `@prisma/adapter-libsql` for pure-JS SQLite (no native binaries).
- **Role-based access**: Enforced server-side in every API route; never trusted from client.
