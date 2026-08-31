import { UserRepository } from "./users.repository";
import type { PublicLoginInput, PublicRegisterInput } from "./users.types";
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  UserNotFoundError,
  UserIsSuperAdminError,
  UserIsAlreadyCompanyAdminError,
} from "./users.errors";
import bcrypt from "bcrypt";
import { Role, User } from "@prisma/client";

const userRepo = new UserRepository();

export async function register(data: PublicRegisterInput) {
  const existing = await userRepo.findByEmail(data.email);
  if (existing) {
    throw new EmailAlreadyExistsError();
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  return userRepo.create({
    name: data.name,
    email: data.email,
    password: passwordHash,
  });
}

export async function login(data: PublicLoginInput) {
  const user = await userRepo.findByEmail(data.email);
  if (!user) {
    throw new InvalidCredentialsError();
  }

  const passwordMatches = await bcrypt.compare(data.password, user.password);
  if (!passwordMatches) {
    throw new InvalidCredentialsError();
  }

  return user;
}

export async function getUserProfile(
  userId: number,
): Promise<Omit<User, "password">> {
  const user = await userRepo.findById(userId);

  if (!user) {
    throw new UserNotFoundError();
  }

  const { password: _password, ...profile } = user;
  return profile;
}

export async function promoteToCompanyAdmin(userId: number, companyId: number) {
  const user = await userRepo.findById(userId);

  if (!user) {
    throw new UserNotFoundError();
  }

  const { id, role } = user;

  if (role === "SUPER_ADMIN") {
    throw new UserIsSuperAdminError();
  }

  if (role === "COMPANY_ADMIN") {
    throw new UserIsAlreadyCompanyAdminError();
  }

  const updatedFields = { role: Role["COMPANY_ADMIN"], companyId: companyId };

  return userRepo.update(id, updatedFields);
}
