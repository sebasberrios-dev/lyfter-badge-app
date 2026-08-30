"use server";
import { getAuditLogs } from "./audit-log.service";
import {
  UnauthenticatedError,
  ForbiddenError,
  requireRole,
} from "@/lib/auth-guard";
import { AuditLogFilters } from "./audit-log.types";

export async function getAuditLogsHandler(filters?: AuditLogFilters) {
  try {
    const session = await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);

    const resolvedCompanyId =
      (session.role === "SUPER_ADMIN"
        ? filters?.companyId
        : session.companyId) ?? undefined;

    const logs = await getAuditLogs({
      ...filters,
      companyId: resolvedCompanyId,
    });
    return { success: true, data: logs };
  } catch (err) {
    if (err instanceof UnauthenticatedError || err instanceof ForbiddenError) {
      return { success: false, error: err.message };
    }

    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}
