import { User, Prisma, Role } from "@prisma/client";
import z from "zod";
import { loginSchema, registerSchema } from "./users.schema";

export type UserFilters = {
  q?: string;
  role?: Role;
  companyId?: number;
  isActive?: boolean;
};

export type UserListItem = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    role: true;
    companyId: true;
    isActive: true;
    totalXp: true;
    company: { select: { name: true } };
  };
}>;

export interface IUserRepository {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findMany(
    filters: UserFilters,
    page: number,
    pageSize: number,
  ): Promise<{ users: UserListItem[]; total: number }>;
  create(data: Prisma.UserUncheckedCreateInput): Promise<User>;
  update(userId: number, data: Prisma.UserUncheckedUpdateInput): Promise<User>;
}

export type PublicRegisterInput = z.infer<typeof registerSchema>;

export type PublicLoginInput = z.infer<typeof loginSchema>;
