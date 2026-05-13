type PrismaClientLike = Record<string, unknown>;

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClientLike;
};

export async function getPrismaClient(): Promise<PrismaClientLike> {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const dynamicImport = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<{ PrismaClient: new () => PrismaClientLike }>;
  const { PrismaClient } = await dynamicImport("@prisma/client");
  const client = new PrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}
