import { AuditLog, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  AuditLogFilters,
  AuditLogWithUser,
  IAuditLogRepository,
} from "./audit-log.types";

export class AuditLogRepository implements IAuditLogRepository {
  async create(data: Prisma.AuditLogUncheckedCreateInput): Promise<AuditLog> {
    return prisma.auditLog.create({ data });
  }

  async findMany(filters: AuditLogFilters): Promise<AuditLogWithUser[]> {
    return prisma.auditLog.findMany({
      where: {
        userId: filters.userId,
        action: filters.action,
        entity: filters.entity,
        entityId: filters.entityId,
        companyId: filters.companyId,
        eventId: filters.eventId,
        createdAt: {
          gte: filters.createdAtFrom,
          lte: filters.createdAtTo,
        },
      },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
}
