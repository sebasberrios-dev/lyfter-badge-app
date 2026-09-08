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

  async findMany(
    filters: AuditLogFilters,
  ): Promise<{ logs: AuditLogWithUser[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {
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
      user: filters.actorRole ? { role: filters.actorRole } : undefined,
    };

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 25;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }
}
