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

    // Un COMPANY_ADMIN solo ve acciones realizadas por otros COMPANY_ADMIN
    // de su propia empresa -- las acciones de un SUPER_ADMIN sobre esa
    // empresa (ej. asignarle un admin) no le corresponden a su vista.
    const resolvedActorRole =
      session.role === "COMPANY_ADMIN" ? "COMPANY_ADMIN" : filters?.actorRole;

    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 25;

    const { logs, total } = await getAuditLogs({
      ...filters,
      companyId: resolvedCompanyId,
      actorRole: resolvedActorRole,
      page,
      pageSize,
    });
    return { success: true, data: { logs, total, page, pageSize } };
  } catch (err) {
    if (err instanceof UnauthenticatedError || err instanceof ForbiddenError) {
      return { success: false, error: err.message };
    }

    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}
