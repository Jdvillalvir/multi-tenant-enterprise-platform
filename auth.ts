import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/security/password";
import { rateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/lib/audit/logger";
import { emailSchema } from "@/lib/validation/schemas";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [Credentials({
    credentials: { email: {}, password: {} },
    async authorize(credentials, request) {
      const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
      const password = typeof credentials?.password === "string" ? credentials.password : "";
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
      const ipRl = await rateLimit(`login-ip:${ip}`, 30, 15 * 60 * 1000);
      const accountRl = await rateLimit(`login-account:${email}`, 8, 15 * 60 * 1000);
      if (!ipRl.allowed || !accountRl.allowed) return null;
      const validEmail = emailSchema.safeParse(email);
      const user = validEmail.success ? await prisma.user.findUnique({ where: { email }, include: { store: true, roles: { include: { role: true } } } }) : null;
      const valid = Boolean(user && user.status === "ACTIVE" && user.store.active && !user.deletedAt && await verifyPassword(password, user.passwordHash));
      if (!valid) { await audit({ action: "LOGIN_FAILED", entity: "User", userId: user?.id, storeId: user?.storeId, ipAddress: ip, userAgent: request.headers.get("user-agent") ?? undefined }); return null; }
      await audit({ action: "LOGIN_SUCCESS", entity: "User", entityId: user.id, userId: user.id, storeId: user.storeId, ipAddress: ip, userAgent: request.headers.get("user-agent") ?? undefined });
      return { id: user.id, email: user.email, name: user.name, storeId: user.storeId, sessionVersion: user.sessionVersion };
    }
  })],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) { token.sub = user.id; token.storeId = user.storeId; token.sessionVersion = user.sessionVersion; }
      if (!token.sub) return token;
      const current = await prisma.user.findUnique({ where: { id: token.sub }, select: { status: true, deletedAt: true, sessionVersion: true, storeId: true, store: { select: { active: true, deletedAt: true } } } });
      if (!current || current.status !== "ACTIVE" || current.deletedAt || !current.store.active || current.store.deletedAt || current.sessionVersion !== token.sessionVersion) return {};
      token.storeId = current.storeId;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) { session.user.id = token.sub; session.user.storeId = String(token.storeId); }
      return session;
    }
  }
});
