import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUserRepo = vi.hoisted(() => ({
  findById: vi.fn(),
  findByEmail: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/modules/users/users.repository", () => ({
  UserRepository: vi.fn(function () {
    return mockUserRepo;
  }),
}));

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>();
  return {
    ...actual,
    requireRole: vi.fn(),
  };
});

import { getAllUsers } from "@/modules/users/users.service";
import { getAllUsersHandler } from "@/modules/users/users.actions";
import { requireRole, UnauthenticatedError, ForbiddenError } from "@/lib/auth-guard";

beforeEach(() => {
  vi.resetAllMocks();
});

const superAdminSession = {
  userId: 1,
  role: "SUPER_ADMIN" as const,
  companyId: null,
  expiresAt: new Date(),
};

describe("users: getAllUsers (service)", () => {
  it("happy: delega en el repository con filtros y paginacion", async () => {
    mockUserRepo.findMany.mockResolvedValueOnce({
      users: [{ id: 1, name: "Ana" }],
      total: 1,
    });

    const result = await getAllUsers({ q: "ana" }, 1, 20);

    expect(result.total).toBe(1);
    expect(mockUserRepo.findMany).toHaveBeenCalledWith({ q: "ana" }, 1, 20);
  });
});

describe("users: getAllUsersHandler (action)", () => {
  it("happy: SUPER_ADMIN lista usuarios", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockUserRepo.findMany.mockResolvedValueOnce({
      users: [{ id: 1, name: "Ana" }],
      total: 1,
    });

    const result = await getAllUsersHandler({ role: "PARTICIPANT" }, 1, 20);

    expect(result).toEqual({
      success: true,
      data: { users: [{ id: 1, name: "Ana" }], total: 1 },
    });
    expect(mockUserRepo.findMany).toHaveBeenCalledWith(
      { role: "PARTICIPANT" },
      1,
      20,
    );
  });

  it("happy: sin filtros usa defaults de pagina/tamano", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockUserRepo.findMany.mockResolvedValueOnce({ users: [], total: 0 });

    await getAllUsersHandler();

    expect(mockUserRepo.findMany).toHaveBeenCalledWith({}, 1, 20);
  });

  it("unhappy: COMPANY_ADMIN no tiene acceso -> ForbiddenError", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new ForbiddenError("usuario no autorizado"),
    );

    const result = await getAllUsersHandler();

    expect(result).toEqual({ success: false, error: "usuario no autorizado" });
    expect(mockUserRepo.findMany).not.toHaveBeenCalled();
  });

  it("unhappy: sin sesion -> {success:false, error}", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new UnauthenticatedError("se requiere iniciar sesión"),
    );

    const result = await getAllUsersHandler();

    expect(result).toEqual({
      success: false,
      error: "se requiere iniciar sesión",
    });
  });
});
