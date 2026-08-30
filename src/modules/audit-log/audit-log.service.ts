import { AuditLogRepository } from "./audit-log.repository";
import { AuditLogFilters, CreateAuditLogInput } from "./audit-log.types";

const auditLogRepo = new AuditLogRepository();

export async function logAudit(input: CreateAuditLogInput) {
  return auditLogRepo.create(input);
}

export async function logAuditSafe(input: CreateAuditLogInput) {
  try {
    await logAudit(input);
  } catch (err) {
    console.error("no se pudo escribir el audit log:", err);
  }
}

export async function getAuditLogs(filters: AuditLogFilters) {
  return auditLogRepo.findMany(filters);
}
