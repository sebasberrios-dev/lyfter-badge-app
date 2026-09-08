"use server";
import {
  ForbiddenError,
  requireRole,
  UnauthenticatedError,
} from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { CompanyFilters, createCompanyInput, updateCompanyInput } from "./companies.types";
import {
  assignAdmin,
  createCompany,
  deleteCompany,
  getAdminsCompany,
  getAllCompanies,
  getCompanyById,
  updateCompany,
} from "./companies.service";
import {
  CompanyAlreadyExistsError,
  CompanyCannotBeDeletedError,
  CompanyNotFoundError,
} from "./companies.errors";
import {
  UserIsAlreadyCompanyAdminError,
  UserIsSuperAdminError,
  UserNotFoundError,
} from "../users/users.errors";
import { getUserByEmail } from "../users/users.service";
import {
  assignAdminByEmailSchema,
  createCompanySchema,
  updateCompanySchema,
} from "./companies.schema";
import z from "zod";
import { logAuditSafe } from "../audit-log/audit-log.service";

export async function createCompanyHandler(data: createCompanyInput) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const parsed = createCompanySchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: z.treeifyError(parsed.error) };
    }
    const company = await createCompany(parsed.data);

    await logAuditSafe({
      userId: session.userId,
      action: "CREATE",
      entity: "COMPANY",
      entityId: company.id,
      companyId: company.id,
    });

    revalidatePath("/admin/companies");
    return { success: true, data: company };
  } catch (err) {
    if (
      err instanceof CompanyAlreadyExistsError ||
      err instanceof UnauthenticatedError ||
      err instanceof ForbiddenError
    ) {
      return { success: false, error: err.message };
    }
    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}

export async function getAllCompaniesHandler(
  filters?: CompanyFilters,
  page: number = 1,
  pageSize: number = 20,
) {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const result = await getAllCompanies(filters ?? {}, page, pageSize);
    return { success: true, data: result };
  } catch (err) {
    if (err instanceof UnauthenticatedError || err instanceof ForbiddenError) {
      return { success: false, error: err.message };
    }
    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}

export async function getCompanyByIdHandler(companyId: number) {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const company = await getCompanyById(companyId);
    const adminsInfo = await getAdminsCompany(companyId);
    return { success: true, data: { company, ...adminsInfo } };
  } catch (err) {
    if (
      err instanceof CompanyNotFoundError ||
      err instanceof UnauthenticatedError ||
      err instanceof ForbiddenError
    ) {
      return { success: false, error: err.message };
    }
    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}

export async function updateCompanyHandler(
  companyId: number,
  data: updateCompanyInput,
) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const parsed = updateCompanySchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: z.treeifyError(parsed.error) };
    }
    const company = await updateCompany(companyId, parsed.data);

    await logAuditSafe({
      userId: session.userId,
      action: "UPDATE",
      entity: "COMPANY",
      entityId: companyId,
      companyId,
    });

    revalidatePath("/admin/companies");
    revalidatePath(`/admin/companies/${companyId}`);
    return { success: true, data: company };
  } catch (err) {
    if (
      err instanceof CompanyNotFoundError ||
      err instanceof CompanyAlreadyExistsError ||
      err instanceof UnauthenticatedError ||
      err instanceof ForbiddenError
    ) {
      return { success: false, error: err.message };
    }
    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}

export async function deleteCompanyHandler(companyId: number) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const deleted = await deleteCompany(companyId);

    await logAuditSafe({
      userId: session.userId,
      action: "DELETE",
      entity: "COMPANY",
      entityId: companyId,
      companyId,
    });

    revalidatePath("/admin/companies");
    return { success: true, data: deleted };
  } catch (err) {
    if (
      err instanceof CompanyNotFoundError ||
      err instanceof CompanyCannotBeDeletedError ||
      err instanceof UnauthenticatedError ||
      err instanceof ForbiddenError
    ) {
      return { success: false, error: err.message };
    }
    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}

export async function assignAdminByEmailHandler(
  email: string,
  companyId: number,
) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const parsed = assignAdminByEmailSchema.safeParse({ email });
    if (!parsed.success) {
      return { success: false, error: z.treeifyError(parsed.error) };
    }
    const user = await getUserByEmail(parsed.data.email);
    const admin = await assignAdmin(user.id, companyId);

    await logAuditSafe({
      userId: session.userId,
      action: "UPDATE",
      entity: "USER",
      entityId: user.id,
      companyId,
    });

    revalidatePath("/admin/companies");
    revalidatePath(`/admin/companies/${companyId}`);
    return { success: true, data: admin };
  } catch (err) {
    if (
      err instanceof CompanyNotFoundError ||
      err instanceof UserNotFoundError ||
      err instanceof UserIsSuperAdminError ||
      err instanceof UserIsAlreadyCompanyAdminError ||
      err instanceof UnauthenticatedError ||
      err instanceof ForbiddenError
    ) {
      return { success: false, error: err.message };
    }
    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}

export async function assignAdminHandler(userId: number, companyId: number) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const admin = await assignAdmin(userId, companyId);

    await logAuditSafe({
      userId: session.userId,
      action: "UPDATE",
      entity: "USER",
      entityId: userId,
      companyId,
    });

    revalidatePath("/admin/companies");
    return { success: true, data: admin };
  } catch (err) {
    if (
      err instanceof CompanyNotFoundError ||
      err instanceof UserNotFoundError ||
      err instanceof UserIsSuperAdminError ||
      err instanceof UserIsAlreadyCompanyAdminError ||
      err instanceof UnauthenticatedError ||
      err instanceof ForbiddenError
    ) {
      return { success: false, error: err.message };
    }
    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}
