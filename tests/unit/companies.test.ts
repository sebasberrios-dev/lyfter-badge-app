import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCompanyRepo = vi.hoisted(() => ({
  findById: vi.fn(),
  findByName: vi.fn(),
  findAdminsByCompanyId: vi.fn(),
  findAdminsCountByCompanyId: vi.fn(),
  create: vi.fn(),
}));

const mockPromoteToCompanyAdmin = vi.hoisted(() => vi.fn());
const mockLogAuditSafe = vi.hoisted(() => vi.fn());

vi.mock("@/modules/companies/companies.repository", () => ({
  CompanyRepository: vi.fn(function () {
    return mockCompanyRepo;
  }),
}));

vi.mock("@/modules/users/users.service", () => ({
  promoteToCompanyAdmin: mockPromoteToCompanyAdmin,
}));

vi.mock("@/modules/audit-log/audit-log.service", () => ({
  logAuditSafe: mockLogAuditSafe,
}));

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>();
  return {
    ...actual,
    requireAuth: vi.fn(),
    requireRole: vi.fn(),
    requireCompanyOwnership: vi.fn(),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createCompany, assignAdmin } from "@/modules/companies/companies.service";
import {
  createCompanyHandler,
  assignAdminHandler,
} from "@/modules/companies/companies.actions";
import {
  CompanyAlreadyExistsError,
  CompanyNotFoundError,
} from "@/modules/companies/companies.errors";
import {
  UserNotFoundError,
  UserIsSuperAdminError,
  UserIsAlreadyCompanyAdminError,
} from "@/modules/users/users.errors";
import {
  requireRole,
  UnauthenticatedError,
  ForbiddenError,
} from "@/lib/auth-guard";

beforeEach(() => {
  vi.resetAllMocks();
});

const superAdminSession = {
  userId: 1,
  role: "SUPER_ADMIN" as const,
  companyId: null,
  expiresAt: new Date(),
};

describe("companies: createCompany (service)", () => {
  it("happy: crea la empresa", async () => {
    mockCompanyRepo.findByName.mockResolvedValueOnce(null);
    mockCompanyRepo.create.mockResolvedValueOnce({ id: 1, name: "Acme" });

    const result = await createCompany({ name: "Acme" });

    expect(result).toEqual({ id: 1, name: "Acme" });
  });

  it("unhappy: nombre duplicado -> CompanyAlreadyExistsError", async () => {
    mockCompanyRepo.findByName.mockResolvedValueOnce({ id: 1, name: "Acme" });

    await expect(createCompany({ name: "Acme" })).rejects.toThrow(
      CompanyAlreadyExistsError,
    );
    expect(mockCompanyRepo.create).not.toHaveBeenCalled();
  });
});

describe("companies: assignAdmin (service)", () => {
  it("happy: asigna el rol COMPANY_ADMIN y la companyId", async () => {
    mockCompanyRepo.findById.mockResolvedValueOnce({ id: 5, name: "Acme" });
    mockPromoteToCompanyAdmin.mockResolvedValueOnce({
      id: 1,
      role: "COMPANY_ADMIN",
      companyId: 5,
    });

    const result = await assignAdmin(1, 5);

    expect(mockPromoteToCompanyAdmin).toHaveBeenCalledWith(1, 5);
    expect(result.role).toBe("COMPANY_ADMIN");
  });

  it("unhappy: empresa no encontrada -> CompanyNotFoundError, sin llamar a promoteToCompanyAdmin", async () => {
    mockCompanyRepo.findById.mockResolvedValueOnce(null);

    await expect(assignAdmin(1, 999)).rejects.toThrow(CompanyNotFoundError);
    expect(mockPromoteToCompanyAdmin).not.toHaveBeenCalled();
  });

  it("unhappy: propaga UserNotFoundError de promoteToCompanyAdmin", async () => {
    mockCompanyRepo.findById.mockResolvedValueOnce({ id: 5 });
    mockPromoteToCompanyAdmin.mockRejectedValueOnce(new UserNotFoundError());

    await expect(assignAdmin(999, 5)).rejects.toThrow(UserNotFoundError);
  });

  it("unhappy: propaga UserIsSuperAdminError de promoteToCompanyAdmin", async () => {
    mockCompanyRepo.findById.mockResolvedValueOnce({ id: 5 });
    mockPromoteToCompanyAdmin.mockRejectedValueOnce(new UserIsSuperAdminError());

    await expect(assignAdmin(1, 5)).rejects.toThrow(UserIsSuperAdminError);
  });

  it("unhappy: propaga UserIsAlreadyCompanyAdminError de promoteToCompanyAdmin", async () => {
    mockCompanyRepo.findById.mockResolvedValueOnce({ id: 5 });
    mockPromoteToCompanyAdmin.mockRejectedValueOnce(
      new UserIsAlreadyCompanyAdminError(),
    );

    await expect(assignAdmin(1, 5)).rejects.toThrow(
      UserIsAlreadyCompanyAdminError,
    );
  });
});

describe("companies: createCompanyHandler (action)", () => {
  it("happy: SUPER_ADMIN crea la empresa y logAuditSafe queda llamado", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockCompanyRepo.findByName.mockResolvedValueOnce(null);
    mockCompanyRepo.create.mockResolvedValueOnce({ id: 3, name: "Acme" });

    const result = await createCompanyHandler({ name: "Acme" });

    expect(result).toEqual({ success: true, data: { id: 3, name: "Acme" } });
    expect(mockLogAuditSafe).toHaveBeenCalledWith({
      userId: 1,
      action: "CREATE",
      entity: "COMPANY",
      entityId: 3,
      companyId: 3,
    });
  });

  it("unhappy: sin sesion -> {success:false, error}", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new UnauthenticatedError("se requiere iniciar sesión"),
    );

    const result = await createCompanyHandler({ name: "Acme" });

    expect(result).toEqual({
      success: false,
      error: "se requiere iniciar sesión",
    });
  });

  it("unhappy: rol no autorizado -> {success:false, error}", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new ForbiddenError("usuario no autorizado"),
    );

    const result = await createCompanyHandler({ name: "Acme" });

    expect(result).toEqual({ success: false, error: "usuario no autorizado" });
  });

  it("unhappy: body invalido -> detalle de Zod, sin llamar al service", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);

    const result: any = await createCompanyHandler({ name: "" });

    expect(result.success).toBe(false);
    expect(mockCompanyRepo.create).not.toHaveBeenCalled();
  });
});

describe("companies: assignAdminHandler (action)", () => {
  it("happy: SUPER_ADMIN asigna admin y logAuditSafe queda llamado", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockCompanyRepo.findById.mockResolvedValueOnce({ id: 5 });
    mockPromoteToCompanyAdmin.mockResolvedValueOnce({
      id: 2,
      role: "COMPANY_ADMIN",
      companyId: 5,
    });

    const result = await assignAdminHandler(2, 5);

    expect(result.success).toBe(true);
    expect(mockLogAuditSafe).toHaveBeenCalledWith({
      userId: 1,
      action: "UPDATE",
      entity: "USER",
      entityId: 2,
      companyId: 5,
    });
  });

  it("unhappy: sin sesion -> {success:false, error}", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new UnauthenticatedError("se requiere iniciar sesión"),
    );

    const result = await assignAdminHandler(2, 5);

    expect(result).toEqual({
      success: false,
      error: "se requiere iniciar sesión",
    });
  });

  it("unhappy: rol no autorizado -> {success:false, error}", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new ForbiddenError("usuario no autorizado"),
    );

    const result = await assignAdminHandler(2, 5);

    expect(result).toEqual({ success: false, error: "usuario no autorizado" });
  });
});
