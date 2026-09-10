import path from "path";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

function resolveLibSqlUrl(raw: string): string {
  if (!raw.startsWith("file:")) return raw;
  const filePath = raw.slice("file:".length);
  if (filePath.startsWith("/")) return `file://${filePath}`;
  const absolute = path.resolve(process.cwd(), filePath);
  return `file://${absolute}`;
}

const databaseUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
const url = resolveLibSqlUrl(databaseUrl);
const adapter = new PrismaLibSql({ url });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🌱 Seeding ScheduleEasy...");

  // ─── Admin user ────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin1234", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@scheduleeasy.local" },
    update: {},
    create: {
      email: "admin@scheduleeasy.local",
      name: "Admin User",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });
  console.log("  ✓ Admin:", admin.email);

  // ─── Demo customer ─────────────────────────────────────────────────────────
  const customerHash = await bcrypt.hash("customer1234", 12);
  const customer = await prisma.user.upsert({
    where: { email: "jane@example.com" },
    update: {},
    create: {
      email: "jane@example.com",
      name: "Jane Smith",
      passwordHash: customerHash,
      role: "CUSTOMER",
    },
  });
  console.log("  ✓ Customer:", customer.email);

  // ─── Services ──────────────────────────────────────────────────────────────
  const haircut = await prisma.service.upsert({
    where: { id: "svc-haircut" },
    update: {},
    create: {
      id: "svc-haircut",
      name: "Haircut",
      description: "Classic haircut — wash, cut, blow-dry",
      durationMin: 30,
    },
  });

  const coloring = await prisma.service.upsert({
    where: { id: "svc-coloring" },
    update: {},
    create: {
      id: "svc-coloring",
      name: "Hair Coloring",
      description: "Full hair coloring service",
      durationMin: 90,
    },
  });

  const consultation = await prisma.service.upsert({
    where: { id: "svc-consult" },
    update: {},
    create: {
      id: "svc-consult",
      name: "Consultation",
      description: "30-minute consultation session",
      durationMin: 30,
    },
  });

  const deepCondition = await prisma.service.upsert({
    where: { id: "svc-deep-cond" },
    update: {},
    create: {
      id: "svc-deep-cond",
      name: "Deep Conditioning Treatment",
      description: "Intensive deep conditioning for hair health",
      durationMin: 60,
    },
  });

  console.log("  ✓ Services created");

  // ─── Providers ─────────────────────────────────────────────────────────────
  const aliceHash = await bcrypt.hash("provider1234", 12);
  const aliceUser = await prisma.user.upsert({
    where: { email: "alice@scheduleeasy.local" },
    update: {},
    create: {
      email: "alice@scheduleeasy.local",
      name: "Alice Johnson",
      passwordHash: aliceHash,
      role: "PROVIDER",
    },
  });

  const alice = await prisma.provider.upsert({
    where: { userId: aliceUser.id },
    update: {},
    create: {
      userId: aliceUser.id,
      bio: "Senior stylist with 10 years of experience.",
    },
  });

  const bobHash = await bcrypt.hash("provider1234", 12);
  const bobUser = await prisma.user.upsert({
    where: { email: "bob@scheduleeasy.local" },
    update: {},
    create: {
      email: "bob@scheduleeasy.local",
      name: "Bob Williams",
      passwordHash: bobHash,
      role: "PROVIDER",
    },
  });

  const bob = await prisma.provider.upsert({
    where: { userId: bobUser.id },
    update: {},
    create: {
      userId: bobUser.id,
      bio: "Specialist in hair coloring and treatments.",
    },
  });

  console.log("  ✓ Providers created");

  // ─── Provider ↔ Service mappings ───────────────────────────────────────────
  for (const sid of [haircut.id, consultation.id, deepCondition.id]) {
    await prisma.providerService.upsert({
      where: { providerId_serviceId: { providerId: alice.id, serviceId: sid } },
      update: {},
      create: { providerId: alice.id, serviceId: sid },
    });
  }

  for (const sid of [haircut.id, coloring.id, consultation.id, deepCondition.id]) {
    await prisma.providerService.upsert({
      where: { providerId_serviceId: { providerId: bob.id, serviceId: sid } },
      update: {},
      create: { providerId: bob.id, serviceId: sid },
    });
  }

  console.log("  ✓ Provider-service mappings created");

  // ─── Availability ──────────────────────────────────────────────────────────
  const aliceAvailExists = await prisma.availability.count({ where: { providerId: alice.id } });
  if (aliceAvailExists === 0) {
    for (const dow of [1, 2, 3, 4, 5]) {
      await prisma.availability.create({
        data: { providerId: alice.id, dayOfWeek: dow, startTime: "09:00", endTime: "17:00" },
      });
    }
  }

  const bobAvailExists = await prisma.availability.count({ where: { providerId: bob.id } });
  if (bobAvailExists === 0) {
    for (const dow of [1, 3, 5]) {
      await prisma.availability.create({
        data: { providerId: bob.id, dayOfWeek: dow, startTime: "10:00", endTime: "18:00" },
      });
    }
    await prisma.availability.create({
      data: { providerId: bob.id, dayOfWeek: 6, startTime: "09:00", endTime: "14:00" },
    });
  }

  console.log("  ✓ Availability blocks created");
  console.log("\n✅ Seed complete!\n");
  console.log("Demo accounts:");
  console.log("  Admin    admin@scheduleeasy.local / admin1234");
  console.log("  Provider alice@scheduleeasy.local / provider1234");
  console.log("  Provider bob@scheduleeasy.local   / provider1234");
  console.log("  Customer jane@example.com          / customer1234");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
