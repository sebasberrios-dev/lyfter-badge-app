import { Company, User, Prisma } from "@prisma/client";
import { createCompanySchema, updateCompanySchema } from "./companies.schema";
import { z } from "zod";

export type CompanyFilters = {
  name?: string;
};

export type CompanyWithCounts = Company & {
  _count: { events: number; users: number };
};

export interface ICompanyRepository {
  findById(id: number): Promise<Company | null>;
  findByName(name: string): Promise<Company | null>;
  findAdminsByCompanyId(companyId: number): Promise<User[]>;
  findAdminsCountByCompanyId(companyId: number): Promise<number>;
  create(data: Prisma.CompanyUncheckedCreateInput): Promise<Company>;
  findMany(
    filters: CompanyFilters,
    page: number,
    pageSize: number,
  ): Promise<{ companies: CompanyWithCounts[]; total: number }>;
  update(id: number, data: updateCompanyInput): Promise<Company>;
  delete(id: number): Promise<Company>;
}

export type createCompanyInput = z.infer<typeof createCompanySchema>;
export type updateCompanyInput = z.infer<typeof updateCompanySchema>;
