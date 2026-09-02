import { CompanyFilters, createCompanyInput, updateCompanyInput } from "./companies.types";
import { CompanyRepository } from "./companies.repository";
import {
  CompanyAlreadyExistsError,
  CompanyCannotBeDeletedError,
  CompanyNotFoundError,
} from "./companies.errors";
import { promoteToCompanyAdmin } from "../users/users.service";
import { Prisma, User } from "@prisma/client";

const companyRepo = new CompanyRepository();

export async function getCompanyById(companyId: number) {
  const company = await companyRepo.findById(companyId);
  if (!company) {
    throw new CompanyNotFoundError();
  }

  return company;
}

export async function getCompanyByName(name: string) {
  const company = await companyRepo.findByName(name);
  if (!company) {
    throw new CompanyNotFoundError();
  }

  return company;
}

export async function createCompany(data: createCompanyInput) {
  const existing = await companyRepo.findByName(data.name);
  if (existing) {
    throw new CompanyAlreadyExistsError();
  }

  return companyRepo.create(data);
}

export async function getAdminsCompany(
  companyId: number,
): Promise<{ admins: User[]; count: number }> {
  await getCompanyById(companyId);

  const admins = await companyRepo.findAdminsByCompanyId(companyId);

  return { admins: admins, count: admins.length };
}

export async function assignAdmin(userId: number, companyId: number) {
  await getCompanyById(companyId);

  return promoteToCompanyAdmin(userId, companyId);
}

export async function getAllCompanies(
  filters: CompanyFilters,
  page: number,
  pageSize: number,
) {
  return companyRepo.findMany(filters, page, pageSize);
}

export async function updateCompany(companyId: number, data: updateCompanyInput) {
  await getCompanyById(companyId);

  if (data.name) {
    const existing = await companyRepo.findByName(data.name);
    if (existing && existing.id !== companyId) {
      throw new CompanyAlreadyExistsError();
    }
  }

  return companyRepo.update(companyId, data);
}

export async function deleteCompany(companyId: number) {
  await getCompanyById(companyId);

  try {
    return await companyRepo.delete(companyId);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2039"
    ) {
      throw new CompanyCannotBeDeletedError();
    }
    throw err;
  }
}
