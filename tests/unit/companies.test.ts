import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCompanyRepo = vi.hoisted(() => ({
  findById: vi.fn(),
  findByName: vi.fn(),
  findAdminsByCompanyId: vi.fn(),
  findAdminsCountByCompanyId: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

const mockPromoteToCompanyAdmin = vi.hoisted(() => vi.fn());
const mockGetUserByEmail = vi.hoisted(() => vi.fn());
const mockLogAuditSafe = vi.hoisted(() => vi.fn());

vi.mock("@/modules/companies/companies.repository", () => ({
  CompanyRepository: vi.fn(function () {
    return mockCompanyRepo;
  }),
}));

vi.mock("@/modules/users/users.service", () => ({
  promoteToCompanyAdmin: mockPromoteToCompanyAdmin,
  getUserByEmail: mockGetUserByEmail,
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

import { Prisma } from "@prisma/client";
import {
  assignAdmin,
  createCompany,
  deleteCompany,
  getAllCompanies,
  updateCompany,
} from "@/modules/companies/companies.service";
import {
  assignAdminByEmailHandler,
  assignAdminHandler,
  createCompanyHandler,
  deleteCompanyHandler,
  getAllCompaniesHandler,
  getCompanyByIdHandler,
  updateCompanyHandler,
} from "@/modules/companies/companies.actions";
import {
  CompanyAlreadyExistsError,
  CompanyCannotBeDeletedError,
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

describe("companies: getAllCompanies / updateCompany / deleteCompany (service)", () => {
  it("getAllCompanies reenvia filtros/paginacion al repository", async () => {
    mockCompanyRepo.findMany.mockResolvedValueOnce({ companies: [], total: 0 });

    const result = await getAllCompanies({ name: "Acme" }, 2, 10);

    expect(mockCompanyRepo.findMany).toHaveBeenCalledWith({ name: "Acme" }, 2, 10);
    expect(result).toEqual({ companies: [], total: 0 });
  });

  it("updateCompany happy: actualiza cuando la empresa existe", async () => {
    mockCompanyRepo.findById.mockResolvedValueOnce({ id: 5, name: "Acme" });
    mockCompanyRepo.update.mockResolvedValueOnce({ id: 5, name: "Acme 2" });

    const result = await updateCompany(5, { name: "Acme 2" });

    expect(result).toEqual({ id: 5, name: "Acme 2" });
  });

  it("updateCompany unhappy: empresa no encontrada -> CompanyNotFoundError", async () => {
    mockCompanyRepo.findById.mockResolvedValueOnce(null);

    await expect(updateCompany(999, { name: "X" })).rejects.toThrow(
      CompanyNotFoundError,
    );
    expect(mockCompanyRepo.update).not.toHaveBeenCalled();
  });

  it("updateCompany unhappy: nombre nuevo ya usado por otra empresa -> CompanyAlreadyExistsError", async () => {
    mockCompanyRepo.findById.mockResolvedValueOnce({ id: 5, name: "Acme" });
    mockCompanyRepo.findByName.mockResolvedValueOnce({ id: 6, name: "Otra" });

    await expect(updateCompany(5, { name: "Otra" })).rejects.toThrow(
      CompanyAlreadyExistsError,
    );
    expect(mockCompanyRepo.update).not.toHaveBeenCalled();
  });

  it("deleteCompany happy: elimina una empresa sin eventos asociados", async () => {
    mockCompanyRepo.findById.mockResolvedValueOnce({ id: 5, name: "Acme" });
    mockCompanyRepo.delete.mockResolvedValueOnce({ id: 5, name: "Acme" });

    const result = await deleteCompany(5);

    expect(result).toEqual({ id: 5, name: "Acme" });
  });

  it("deleteCompany unhappy: empresa con eventos asociados -> CompanyCannotBeDeletedError", async () => {
    mockCompanyRepo.findById.mockResolvedValueOnce({ id: 5, name: "Acme" });
    mockCompanyRepo.delete.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("constraint violated", {
        code: "P2039",
        clientVersion: "7.9.1",
      }),
    );

    await expect(deleteCompany(5)).rejects.toThrow(CompanyCannotBeDeletedError);
  });
});

describe("companies: getAllCompaniesHandler / getCompanyByIdHandler / updateCompanyHandler / deleteCompanyHandler / assignAdminByEmailHandler (actions)", () => {
  it("getAllCompaniesHandler happy: SUPER_ADMIN lista empresas", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockCompanyRepo.findMany.mockResolvedValueOnce({ companies: [{ id: 1 }], total: 1 });

    const result = await getAllCompaniesHandler();

    expect(result).toEqual({ success: true, data: { companies: [{ id: 1 }], total: 1 } });
  });

  it("getAllCompaniesHandler unhappy: rol no autorizado -> {success:false, error}", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new ForbiddenError("usuario no autorizado"),
    );

    const result = await getAllCompaniesHandler();

    expect(result).toEqual({ success: false, error: "usuario no autorizado" });
  });

  it("getCompanyByIdHandler happy: devuelve empresa + admins", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    // getCompanyByIdHandler llama getCompanyById() directo y de nuevo indirecto
    // vía getAdminsCompany() -- ambos golpean companyRepo.findById.
    mockCompanyRepo.findById.mockResolvedValue({ id: 5, name: "Acme" });
    mockCompanyRepo.findAdminsByCompanyId.mockResolvedValueOnce([{ id: 2 }]);

    const result: any = await getCompanyByIdHandler(5);

    expect(result.success).toBe(true);
    expect(result.data.company).toEqual({ id: 5, name: "Acme" });
    expect(result.data.count).toBe(1);
  });

  it("getCompanyByIdHandler unhappy: empresa no encontrada -> {success:false, error}", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockCompanyRepo.findById.mockResolvedValueOnce(null);

    const result = await getCompanyByIdHandler(999);

    expect(result).toEqual({ success: false, error: "no se encontró la empresa" });
  });

  it("updateCompanyHandler happy: SUPER_ADMIN actualiza y logAuditSafe queda llamado", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockCompanyRepo.findById.mockResolvedValueOnce({ id: 5, name: "Acme" });
    mockCompanyRepo.update.mockResolvedValueOnce({ id: 5, name: "Acme 2" });

    const result = await updateCompanyHandler(5, { name: "Acme 2" });

    expect(result).toEqual({ success: true, data: { id: 5, name: "Acme 2" } });
    expect(mockLogAuditSafe).toHaveBeenCalledWith({
      userId: 1,
      action: "UPDATE",
      entity: "COMPANY",
      entityId: 5,
      companyId: 5,
    });
  });

  it("deleteCompanyHandler happy: SUPER_ADMIN elimina y logAuditSafe queda llamado", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockCompanyRepo.findById.mockResolvedValueOnce({ id: 5, name: "Acme" });
    mockCompanyRepo.delete.mockResolvedValueOnce({ id: 5, name: "Acme" });

    const result = await deleteCompanyHandler(5);

    expect(result).toEqual({ success: true, data: { id: 5, name: "Acme" } });
    expect(mockLogAuditSafe).toHaveBeenCalledWith({
      userId: 1,
      action: "DELETE",
      entity: "COMPANY",
      entityId: 5,
      companyId: 5,
    });
  });

  it("deleteCompanyHandler unhappy: empresa con eventos -> {success:false, error} sin lanzar", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockCompanyRepo.findById.mockResolvedValueOnce({ id: 5, name: "Acme" });
    mockCompanyRepo.delete.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("constraint violated", {
        code: "P2039",
        clientVersion: "7.9.1",
      }),
    );

    const result = await deleteCompanyHandler(5);

    expect(result).toEqual({
      success: false,
      error: "no se puede eliminar la empresa: tiene eventos asociados",
    });
  });

  it("assignAdminByEmailHandler happy: busca por email y delega en assignAdmin", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockGetUserByEmail.mockResolvedValueOnce({ id: 2, email: "x@example.com" });
    mockCompanyRepo.findById.mockResolvedValueOnce({ id: 5 });
    mockPromoteToCompanyAdmin.mockResolvedValueOnce({
      id: 2,
      role: "COMPANY_ADMIN",
      companyId: 5,
    });

    const result = await assignAdminByEmailHandler("x@example.com", 5);

    expect(mockGetUserByEmail).toHaveBeenCalledWith("x@example.com");
    expect(mockPromoteToCompanyAdmin).toHaveBeenCalledWith(2, 5);
    expect(result.success).toBe(true);
  });

  it("assignAdminByEmailHandler unhappy: email no existe -> {success:false, error}, sin llamar assignAdmin", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockGetUserByEmail.mockRejectedValueOnce(new UserNotFoundError());

    const result = await assignAdminByEmailHandler("noexiste@example.com", 5);

    expect(result).toEqual({ success: false, error: "usuario no encontrado" });
    expect(mockPromoteToCompanyAdmin).not.toHaveBeenCalled();
  });
});
