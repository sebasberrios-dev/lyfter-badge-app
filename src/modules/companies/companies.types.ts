import { Company, User, Prisma } from "@prisma/client";
import { createCompanySchema } from "./companies.schema";
import { z } from "zod";

export interface ICompanyRepository {
  findById(id: number): Promise<Company | null>;
  findByName(name: string): Promise<Company | null>;
  findAdminsByCompanyId(companyId: number): Promise<User[]>;
  findAdminsCountByCompanyId(companyId: number): Promise<number>;
  create(data: Prisma.CompanyUncheckedCreateInput): Promise<Company>;
}

export type createCompanyInput = z.infer<typeof createCompanySchema>;
