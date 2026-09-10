import path from "path";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function resolveLibSqlUrl(raw: string): string {
  if (!raw.startsWith("file:")) return raw;

  // Strip "file:" prefix to get the path portion
  const filePath = raw.slice("file:".length);

  // If already absolute (starts with /), convert to file:///absolute
  if (filePath.startsWith("/")) {
    return `file://${filePath}`;
  }

  // Relative path — resolve against cwd
  const absolute = path.resolve(/*turbopackIgnore: true*/ process.cwd(), filePath);
  return `file://${absolute}`;
}

function getPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
  const url = resolveLibSqlUrl(databaseUrl);
  const adapter = new PrismaLibSql({ url });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? getPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
