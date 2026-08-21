import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/security/password";
import { userCreateSchema } from "@/lib/validation/schemas";
import { apiAuth, errorResponse } from "@/lib/services/api";
import { audit } from "@/lib/audit/logger";
import { rateLimit } from "@/lib/security/rate-limit";

export async function GET(request: NextRequest) {
  const a = await apiAuth("users.view", request); if ("response" in a) return a.response;
  const user = a.user; const sp = request.nextUrl.searchParams; const page = Math.max(1, Number(sp.get("page") ?? 1) || 1); const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? 20) || 20)); const search = sp.get("search")?.trim();
  try {
    const where = { storeId: user.storeId, deletedAt: null, ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] } : {}) };
    const [items,total] = await Promise.all([prisma.user.findMany({ where, select: { id:true,name:true,email:true,status:true,createdAt:true,roles:{select:{role:{select:{id:true,name:true,permissions:{select:{permission:{select:{key:true}}}}}}}} }, orderBy:{createdAt:"desc"}, skip:(page-1)*pageSize, take:pageSize }), prisma.user.count({where})]);
    return NextResponse.json({ items, page, pageSize, total });
  } catch(e){ return errorResponse(e); }
}
export async function POST(request: NextRequest) {
  const a = await apiAuth("users.create", request); if ("response" in a) return a.response; const user = a.user;
  const rl = await rateLimit(`user-create:${user.id}`, 20, 60*60*1000); if (!rl.allowed) return NextResponse.json({error:"Demasiadas solicitudes"},{status:429});
  try {
    const body = userCreateSchema.parse(await request.json());
    if (body.storeId !== user.storeId && !user.roles.some(r=>r.role.name === "SUPER_ADMIN" && r.role.scope === "GLOBAL")) return NextResponse.json({error:"No autorizado"},{status:403});
    const role = await prisma.role.findFirst({ where:{ id:body.roleId, OR:[{storeId:body.storeId},{scope:"GLOBAL"}] } }); if(!role) return NextResponse.json({error:"Rol inválido"},{status:400});
    if (role.name === "SUPER_ADMIN" && !user.roles.some(r=>r.role.name === "SUPER_ADMIN")) return NextResponse.json({error:"No autorizado"},{status:403});
    const passwordHash = await hashPassword(body.password);
    const created = await prisma.$transaction(async tx=>{ const u=await tx.user.create({data:{name:body.name,email:body.email,passwordHash,storeId:body.storeId}}); await tx.userRole.create({data:{userId:u.id,roleId:role.id}}); return u; });
    await audit({action:"USER_CREATED",entity:"User",entityId:created.id,storeId:created.storeId,userId:user.id});
    return NextResponse.json({id:created.id,name:created.name,email:created.email,storeId:created.storeId},{status:201});
  } catch(e){ if(e instanceof Error && e.name === "ZodError") return NextResponse.json({error:"Datos inválidos"},{status:400}); return errorResponse(e); }
}
