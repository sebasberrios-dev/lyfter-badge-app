import { Badge, Prisma } from "@prisma/client";
import {
  BadgeFilters,
  IBadgeRepository,
  updateBadgeInput,
  BadgeWithCompany,
} from "./badges.types";
import { prisma } from "@/lib/prisma";

export class BadgeRepository implements IBadgeRepository {
  async findById(id: number): Promise<BadgeWithCompany | null> {
    return prisma.badge.findUnique({
      where: { id },
      include: { event: { select: { companyId: true } } },
    });
  }

  async findMany(filters: BadgeFilters): Promise<Badge[]> {
    return prisma.badge.findMany({
      where: {
        name: filters.name
          ? { contains: filters.name, mode: "insensitive" }
          : undefined,
        eventId: filters.eventId,
        type: filters.type,
        rarity: filters.rarity,
        event: filters.companyId ? { companyId: filters.companyId } : undefined,
      },
    });
  }

  async create(data: Prisma.BadgeUncheckedCreateInput): Promise<Badge> {
    return prisma.badge.create({ data });
  }

  async update(id: number, data: updateBadgeInput): Promise<Badge> {
    return prisma.badge.update({ data, where: { id } });
  }

  async delete(id: number): Promise<Badge> {
    return prisma.badge.delete({ where: { id } });
  }
}
