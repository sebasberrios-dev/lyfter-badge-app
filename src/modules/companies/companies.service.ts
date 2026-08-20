import { createCompanyInput } from "./companies.types";
import { CompanyRepository } from "./companies.repository";
import {
  CompanyAlreadyExistsError,
  CompanyNotFoundError,
} from "./companies.errors";
import { promoteToCompanyAdmin } from "../users/users.service";
import { User } from "@prisma/client";

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
