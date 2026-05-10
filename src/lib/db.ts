import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL is not set');

const dbSchema = (() => {
  try { return new URL(dbUrl).searchParams.get('schema') ?? 'public'; }
  catch { return 'public'; }
})();

const adapter = new PrismaPg({ connectionString: dbUrl }, { schema: dbSchema });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;