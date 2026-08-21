import "server-only";
import { NextRequest } from "next/server";

export function clientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const allowed = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  return allowed.includes(origin) || origin === new URL(process.env.AUTH_URL ?? "http://localhost:3000").origin;
}
