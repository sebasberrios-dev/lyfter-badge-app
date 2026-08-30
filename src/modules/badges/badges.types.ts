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
