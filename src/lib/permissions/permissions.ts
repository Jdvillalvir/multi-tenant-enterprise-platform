import "server-only";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { forbidden } from "next/navigation";

export async function hasPermission(userId: string, permission: string) {
  const roles = await prisma.userRole.findMany({ where: { userId }, include: { role: { include: { permissions: { include: { permission: true } } } } } });
  return roles.some((ur) => ur.role.permissions.some((rp) => rp.permission.key === permission));
}
export async function requirePermission(permission: string) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const allowed = user.roles.some((ur) => ur.role.permissions.some((rp) => rp.permission.key === permission));
  if (!allowed) forbidden();
  return user;
}
export function permissionKeys(user: Awaited<ReturnType<typeof getAuthenticatedUser>>) { return user?.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.key)) ?? []; }
