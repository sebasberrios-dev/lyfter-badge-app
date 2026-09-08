import {
  CompanyFilters,
  CompanyWithCounts,
  ICompanyRepository,
  updateCompanyInput,
} from "./companies.types";
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

  async findMany(
    filters: CompanyFilters,
    page: number,
    pageSize: number,
  ): Promise<{ companies: CompanyWithCounts[]; total: number }> {
    const where: Prisma.CompanyWhereInput = {
      name: filters.name
        ? { contains: filters.name, mode: "insensitive" }
        : undefined,
    };

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: { _count: { select: { events: true, users: true } } },
        orderBy: { name: "asc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      prisma.company.count({ where }),
    ]);

    return { companies, total };
  }

  async update(id: number, data: updateCompanyInput): Promise<Company> {
    return prisma.company.update({ where: { id }, data });
  }

  async delete(id: number): Promise<Company> {
    return prisma.company.delete({ where: { id } });
  }
}
