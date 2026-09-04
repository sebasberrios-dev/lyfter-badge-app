"use server";
import { ForbiddenError, requireRole, UnauthenticatedError } from "@/lib/auth-guard";
import { getDashboardMetrics } from "./dashboard.service";

export async function getDashboardMetricsHandler(filters?: { companyId?: number }) {
  try {
    const session = await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);

    const resolvedCompanyId =
      (session.role === "SUPER_ADMIN" ? filters?.companyId : session.companyId) ?? null;

    const data = await getDashboardMetrics(resolvedCompanyId);
    return { success: true, data };
  } catch (err) {
    if (err instanceof UnauthenticatedError || err instanceof ForbiddenError) {
      return { success: false, error: err.message };
    }
    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}
