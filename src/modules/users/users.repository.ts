import { Prisma, User } from "@prisma/client";
import { IUserRepository, UserFilters, UserListItem } from "./users.types";
import { prisma } from "@/lib/prisma";

export class UserRepository implements IUserRepository {
  async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findMany(
    filters: UserFilters,
    page: number,
    pageSize: number,
  ): Promise<{ users: UserListItem[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      role: filters.role,
      companyId: filters.companyId,
      isActive: filters.isActive,
      OR: filters.q
        ? [
            { name: { contains: filters.q, mode: "insensitive" } },
            { email: { contains: filters.q, mode: "insensitive" } },
          ]
        : undefined,
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyId: true,
          isActive: true,
          totalXp: true,
          company: { select: { name: true } },
        },
        orderBy: { name: "asc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
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
