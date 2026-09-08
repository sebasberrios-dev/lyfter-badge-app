import { Badge, BadgeRarity, BadgeType, Prisma } from "@prisma/client";
import { createBadgeSchema, updateBadgeSchema } from "./badges.schema";
import z from "zod";

export type BadgeFilters = {
  name?: string;
  eventId?: number;
  companyId?: number;
  type?: BadgeType;
  rarity?: BadgeRarity;
};

export interface IBadgeRepository {
  findById(id: number): Promise<BadgeWithCompany | null>;
  findByIdWithEventAndCompany(id: number): Promise<BadgePublicSelect | null>;
  findByQrToken(qrToken: string): Promise<Badge | null>;
  findMany(filters: BadgeFilters): Promise<Badge[]>;
  create(data: Prisma.BadgeUncheckedCreateInput): Promise<Badge>;
  update(id: number, data: updateBadgeInput): Promise<Badge>;
  delete(id: number): Promise<Badge>;
}

export type createBadgeInput = z.infer<typeof createBadgeSchema>;
export type updateBadgeInput = z.infer<typeof updateBadgeSchema>;
export type BadgeWithCompany = Prisma.BadgeGetPayload<{
  include: { event: { select: { companyId: true } } };
}>;

// Select explícito (sin qrToken) para la vista pública de un badge — usado
// por la página de compartir y la imagen OG, nunca debe incluir campos sensibles.
export type BadgePublicSelect = Prisma.BadgeGetPayload<{
  select: {
    id: true;
    name: true;
    description: true;
    xpValue: true;
    icon: true;
    type: true;
    rarity: true;
    event: { select: { name: true; company: { select: { name: true } } } };
  };
}>;

export type PublicBadgeDetail = {
  id: number;
  name: string;
  description: string;
  xpValue: number;
  icon: string;
  type: BadgeType;
  rarity: BadgeRarity;
  eventName: string;
  companyName: string;
};
