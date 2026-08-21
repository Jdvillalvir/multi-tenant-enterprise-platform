import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";

export async function getAuthenticatedUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null, status: "ACTIVE", store: { active: true, deletedAt: null } }, include: { store: true, roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
  if (!user) return null;
  return user;
}
export async function requireUser() { const user = await getAuthenticatedUser(); if (!user) redirect("/login"); return user; }
