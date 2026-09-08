import { AuditLog, Prisma, Role } from "@prisma/client";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE";
export type AuditEntity = "COMPANY" | "EVENT" | "BADGE" | "USER";

export type CreateAuditLogInput = {
  userId: number;
  action: AuditAction;
  entity: AuditEntity;
  entityId: number;
  companyId?: number;
  eventId?: number;
};

export type AuditLogFilters = {
  userId?: number;
  action?: string;
  entity?: string;
  entityId?: number;
  companyId?: number;
  eventId?: number;
  createdAtFrom?: Date;
  createdAtTo?: Date;
  /** Rol del usuario que realizó la acción (no necesariamente su rol actual). */
  actorRole?: Role;
  page?: number;
  pageSize?: number;
};

export type AuditLogWithUser = Prisma.AuditLogGetPayload<{
  include: { user: { select: { name: true } } };
}>;

export interface IAuditLogRepository {
  create(data: Prisma.AuditLogUncheckedCreateInput): Promise<AuditLog>;
  findMany(
    filters: AuditLogFilters,
  ): Promise<{ logs: AuditLogWithUser[]; total: number }>;
}
