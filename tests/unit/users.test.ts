import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcrypt";

const mockUserRepo = vi.hoisted(() => ({
  findById: vi.fn(),
  findByEmail: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/modules/users/users.repository", () => ({
  UserRepository: vi.fn(function () {
    return mockUserRepo;
  }),
}));

import {
  register,
  login,
  promoteToCompanyAdmin,
} from "@/modules/users/users.service";
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  UserNotFoundError,
  UserIsSuperAdminError,
  UserIsAlreadyCompanyAdminError,
} from "@/modules/users/users.errors";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("users: register", () => {
  it("happy: crea el usuario con password hasheado", async () => {
    mockUserRepo.findByEmail.mockResolvedValueOnce(null);
    mockUserRepo.create.mockImplementationOnce(async (data: any) => ({
      id: 1,
      role: "PARTICIPANT",
      ...data,
    }));

    const result = await register({
      name: "Test User",
      email: "test@example.com",
      password: "Abcdef1!",
      confirmPassword: "Abcdef1!",
    });

    expect(mockUserRepo.create).toHaveBeenCalledTimes(1);
    const createArgs = mockUserRepo.create.mock.calls[0][0];
    expect(createArgs.password).not.toBe("Abcdef1!");
    expect(await bcrypt.compare("Abcdef1!", createArgs.password)).toBe(true);
    expect(result.email).toBe("test@example.com");
  });

  it("unhappy: email duplicado -> EmailAlreadyExistsError", async () => {
    mockUserRepo.findByEmail.mockResolvedValueOnce({ id: 1 });

    await expect(
      register({
        name: "Test",
        email: "dup@example.com",
        password: "Abcdef1!",
        confirmPassword: "Abcdef1!",
      }),
    ).rejects.toThrow(EmailAlreadyExistsError);
    expect(mockUserRepo.create).not.toHaveBeenCalled();
  });
});

describe("users: login", () => {
  it("happy: devuelve el usuario con credenciales correctas", async () => {
    const passwordHash = await bcrypt.hash("Abcdef1!", 10);
    mockUserRepo.findByEmail.mockResolvedValueOnce({
      id: 1,
      email: "test@example.com",
      password: passwordHash,
      role: "PARTICIPANT",
    });

    const result = await login({
      email: "test@example.com",
      password: "Abcdef1!",
    });

    expect(result.id).toBe(1);
  });

  it("unhappy: email no existe -> InvalidCredentialsError", async () => {
    mockUserRepo.findByEmail.mockResolvedValueOnce(null);

    await expect(
      login({ email: "noexiste@example.com", password: "x" }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it("unhappy: password incorrecto -> InvalidCredentialsError", async () => {
    const passwordHash = await bcrypt.hash("Correct1!", 10);
    mockUserRepo.findByEmail.mockResolvedValueOnce({
      id: 1,
      email: "test@example.com",
      password: passwordHash,
    });

    await expect(
      login({ email: "test@example.com", password: "Wrong1!" }),
    ).rejects.toThrow(InvalidCredentialsError);
  });
});

describe("users: promoteToCompanyAdmin", () => {
  it("happy: promueve a COMPANY_ADMIN y asigna companyId", async () => {
    mockUserRepo.findById.mockResolvedValueOnce({ id: 1, role: "PARTICIPANT" });
    mockUserRepo.update.mockResolvedValueOnce({
      id: 1,
      role: "COMPANY_ADMIN",
      companyId: 5,
    });

    const result = await promoteToCompanyAdmin(1, 5);

    expect(mockUserRepo.update).toHaveBeenCalledWith(1, {
      role: "COMPANY_ADMIN",
      companyId: 5,
    });
    expect(result.role).toBe("COMPANY_ADMIN");
  });

  it("unhappy: usuario no encontrado -> UserNotFoundError", async () => {
    mockUserRepo.findById.mockResolvedValueOnce(null);

    await expect(promoteToCompanyAdmin(999, 5)).rejects.toThrow(
      UserNotFoundError,
    );
  });

  it("unhappy: usuario ya es SUPER_ADMIN -> UserIsSuperAdminError", async () => {
    mockUserRepo.findById.mockResolvedValueOnce({ id: 1, role: "SUPER_ADMIN" });

    await expect(promoteToCompanyAdmin(1, 5)).rejects.toThrow(
      UserIsSuperAdminError,
    );
  });

  it("unhappy: usuario ya es COMPANY_ADMIN -> UserIsAlreadyCompanyAdminError", async () => {
    mockUserRepo.findById.mockResolvedValueOnce({
      id: 1,
      role: "COMPANY_ADMIN",
    });

    await expect(promoteToCompanyAdmin(1, 5)).rejects.toThrow(
      UserIsAlreadyCompanyAdminError,
    );
  });
});
