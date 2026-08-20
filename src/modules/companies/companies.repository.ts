import { ICompanyRepository } from "./companies.types";
import { Prisma, Company, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class CompanyRepository implements ICompanyRepository {
  async findById(id: number): Promise<Company | null> {
    return prisma.company.findUnique({ where: { id } });
  }

  async findByName(name: string): Promise<Company | null> {
    return prisma.company.findUnique({ where: { name } });
  }

  async findAdminsByCompanyId(companyId: number): Promise<User[]> {
    return prisma.user.findMany({ where: { companyId } });
  }

  async findAdminsCountByCompanyId(companyId: number): Promise<number> {
    return prisma.user.count({ where: { companyId } });
  }

  async create(data: Prisma.CompanyUncheckedCreateInput): Promise<Company> {
    return prisma.company.create({ data });
  }
}
