import { Prisma, User } from "@prisma/client";
import { IUserRepository } from "./users.types";
import { prisma } from "@/lib/prisma";

export class UserRepository implements IUserRepository {
  async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async create(data: Prisma.UserUncheckedCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }

  async update(
    id: number,
    data: Prisma.UserUncheckedUpdateInput,
  ): Promise<User> {
    return prisma.user.update({ data, where: { id } });
  }
}
