import "server-only";
import { Role } from "@prisma/client";
import { getSession } from "./auth";

export class UnauthenticatedError extends Error {}
export class ForbiddenError extends Error {}

export async function requireAuth() {
  const session = await getSession();
  if (!session) throw new UnauthenticatedError("se requiere iniciar sesión");
  return session;
}

export async function requireRole(allowedRoles: Role[]) {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.role as Role)) {
    throw new ForbiddenError("usuario no autorizado");
  }
  return session;
}

export async function requireCompanyOwnership(companyId: number) {
  const session = await requireAuth();

  if (session.role === "SUPER_ADMIN") return session;

  if (session.role !== "COMPANY_ADMIN" || session.companyId !== companyId) {
    throw new ForbiddenError("usuario no autorizado");
  }

  return session;
}
