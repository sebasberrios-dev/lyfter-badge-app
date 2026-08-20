import { User, Prisma } from "@prisma/client";
import z from "zod";
import { loginSchema, registerSchema } from "./users.schema";

export interface IUserRepository {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: Prisma.UserUncheckedCreateInput): Promise<User>;
  update(userId: number, data: Prisma.UserUncheckedUpdateInput): Promise<User>;
}

export type PublicRegisterInput = z.infer<typeof registerSchema>;

export type PublicLoginInput = z.infer<typeof loginSchema>;
