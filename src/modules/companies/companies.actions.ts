"use server";
import {
  ForbiddenError,
  requireRole,
  UnauthenticatedError,
} from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { createCompanyInput } from "./companies.types";
import { assignAdmin, createCompany } from "./companies.service";
import {
  CompanyAlreadyExistsError,
  CompanyNotFoundError,
} from "./companies.errors";
import {
  UserIsAlreadyCompanyAdminError,
  UserIsSuperAdminError,
  UserNotFoundError,
} from "../users/users.errors";
import { createCompanySchema } from "./companies.schema";
import z from "zod";

export async function createCompanyHandler(data: createCompanyInput) {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const parsed = createCompanySchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: z.treeifyError(parsed.error) };
    }
    const company = await createCompany(parsed.data);
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

export async function assignAdminHandler(userId: number, companyId: number) {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const admin = await assignAdmin(userId, companyId);
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
