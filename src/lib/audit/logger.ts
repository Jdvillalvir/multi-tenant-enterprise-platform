import "server-only";
import { prisma } from "@/lib/db/prisma";

export async function audit(input: { action: string; entity: string; entityId?: string; storeId?: string | null; userId?: string | null; metadata?: Record<string, unknown>; ipAddress?: string; userAgent?: string }) {
  const safeMetadata = input.metadata ? JSON.parse(JSON.stringify(input.metadata, (_k, v) => typeof v === "bigint" ? v.toString() : v)) : undefined;
  await prisma.auditLog.create({ data: { ...input, metadata: safeMetadata } });
}
