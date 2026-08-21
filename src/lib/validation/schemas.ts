import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(12).max(128).regex(/[A-Z]/, "Debe incluir mayúscula").regex(/[a-z]/, "Debe incluir minúscula").regex(/[0-9]/, "Debe incluir número");
export const userCreateSchema = z.object({ name: z.string().trim().min(2).max(120), email: emailSchema, password: passwordSchema, storeId: z.string().cuid(), roleId: z.string().cuid() });
export const userUpdateSchema = z.object({ id: z.string().cuid(), name: z.string().trim().min(2).max(120).optional(), status: z.enum(["ACTIVE", "DISABLED"]).optional() }).strict();
export const recordSchema = z.object({ title: z.string().trim().min(1).max(200), description: z.string().max(5000).optional(), textValue: z.string().max(20000).optional(), numericValue: z.number().finite().optional(), dateValue: z.string().datetime().optional() }).strict();
export const storeSchema = z.object({ name: z.string().trim().min(2).max(150), code: z.string().trim().toUpperCase().min(2).max(30).regex(/^[A-Z0-9_-]+$/), description: z.string().max(5000).optional() }).strict();
export const resetRequestSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ token: z.string().min(32).max(256), password: passwordSchema });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema });
