import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/security/password";
const prisma=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL!})});
const permissions=[
"users.view","users.create","users.update","users.delete","records.view","records.create","records.update","records.delete","files.view","files.upload","files.download","files.delete","stores.view","stores.create","stores.update","stores.delete","roles.view","roles.create","roles.update","roles.delete","audit.view"
];
const roleMap:Record<string,string[]>= {
 SUPER_ADMIN:permissions,
 STORE_ADMIN:["users.view","users.create","users.update","users.delete","records.view","records.create","records.update","records.delete","files.view","files.upload","files.download","files.delete","stores.view","roles.view","roles.create","roles.update","roles.delete","audit.view"],
 MANAGER:["records.view","records.create","records.update","files.view","files.upload","files.download"],
 USER:["records.view","records.create","files.view","files.upload"],
 VIEWER:["records.view","files.view"]
};
async function main(){const email=process.env.SEED_ADMIN_EMAIL;if(!email||!process.env.SEED_ADMIN_PASSWORD)throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required");const store=await prisma.store.upsert({where:{code:"DEMO"},update:{name:"Tienda Demo",active:true,deletedAt:null},create:{name:"Tienda Demo",code:"DEMO",description:"Tenant de demostración"}});const pMap=new Map<string,string>();for(const key of permissions){const p=await prisma.permission.upsert({where:{key},update:{description:key},create:{key,description:key}});pMap.set(key,p.id)}
const roles=new Map<string,string>();for(const [name,keys] of Object.entries(roleMap)){const global=name==="SUPER_ADMIN";const r=await prisma.role.upsert({where:{id: global ? "seed-super-admin" : `${store.id}-${name}`},update:{name,scope:global?"GLOBAL":"STORE",system:true,storeId:global?null:store.id},create:{id:global?"seed-super-admin":`${store.id}-${name}`,name,scope:global?"GLOBAL":"STORE",system:true,storeId:global?null:store.id}});roles.set(name,r.id);await prisma.rolePermission.deleteMany({where:{roleId:r.id}});await prisma.rolePermission.createMany({data:keys.map(key=>({roleId:r.id,permissionId:pMap.get(key)!}))})}
const hash=await hashPassword(process.env.SEED_ADMIN_PASSWORD!);const user=await prisma.user.upsert({where:{email},update:{name:"System Administrator",passwordHash:hash,status:"ACTIVE",storeId:store.id,deletedAt:null},create:{email,name:"System Administrator",passwordHash:hash,storeId:store.id}});await prisma.userRole.deleteMany({where:{userId:user.id}});await prisma.userRole.create({data:{userId:user.id,roleId:roles.get("SUPER_ADMIN")!}});console.log(`Seed completed. Admin: ${email}`)}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
