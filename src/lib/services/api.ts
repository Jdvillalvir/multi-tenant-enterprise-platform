import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions/permissions";
import { sameOrigin } from "@/lib/security/request";import {logger} from "@/lib/security/logger";

export async function apiAuth(permission?: string, request?: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return { response: NextResponse.json({ error: "No autenticado" }, { status: 401 }) } as const;
  if (request && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) && !sameOrigin(request)) return { response: NextResponse.json({ error: "Origen no permitido" }, { status: 403 }) } as const;
  if (permission && !(await hasPermission(user.id, permission))) return { response: NextResponse.json({ error: "No autorizado" }, { status: 403 }) } as const;
  return { user } as const;
}
export function errorResponse(error: unknown) {
  logger.error({err:error}, "request_failed");
  return NextResponse.json({ error: "Ha ocurrido un error. Intente nuevamente." }, { status: 500 });
}
