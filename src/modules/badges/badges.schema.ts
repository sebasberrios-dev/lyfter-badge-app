import { BadgeRarity, BadgeType } from "@prisma/client";
import { z } from "zod";

export const createBadgeSchema = z.object({
  name: z.string().min(1, "nombre del badge obligatorio"),
  description: z
    .string()
    .min(20, "descripción debe ser mínimo de 20 caracteres"),
  xpValue: z.int().positive().min(1),
  icon: z.enum([
    /* Iconos por definir */
  ]),
  type: z.enum(BadgeType),
  rarity: z.enum(BadgeRarity),
});

export const badgeQrTokenQuerySchema = z.object({
  qrToken: z.string().min(1, "qrToken requerido"),
});

export const updateBadgeSchema = createBadgeSchema.partial();
