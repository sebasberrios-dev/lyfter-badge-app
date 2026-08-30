import { AuditLog, Prisma } from "@prisma/client";

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
};

export type AuditLogWithUser = Prisma.AuditLogGetPayload<{
  include: { user: { select: { name: true } } };
}>;

export interface IAuditLogRepository {
  create(data: Prisma.AuditLogUncheckedCreateInput): Promise<AuditLog>;
  findMany(filters: AuditLogFilters): Promise<AuditLogWithUser[]>;
}
