import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuditLogRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/modules/audit-log/audit-log.repository", () => ({
  AuditLogRepository: vi.fn(function () {
    return mockAuditLogRepo;
  }),
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

import {
  logAudit,
  logAuditSafe,
  getAuditLogs,
} from "@/modules/audit-log/audit-log.service";
import { getAuditLogsHandler } from "@/modules/audit-log/audit-log.actions";
import {
  requireRole,
  UnauthenticatedError,
  ForbiddenError,
} from "@/lib/auth-guard";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("audit-log: logAudit / logAuditSafe (escritura)", () => {
  it("logAudit llama al repository con el input tal cual", async () => {
    mockAuditLogRepo.create.mockResolvedValueOnce({ id: 1 });

    await logAudit({
      userId: 1,
      action: "CREATE",
      entity: "EVENT",
      entityId: 5,
      companyId: 2,
    });

    expect(mockAuditLogRepo.create).toHaveBeenCalledWith({
      userId: 1,
      action: "CREATE",
      entity: "EVENT",
      entityId: 5,
      companyId: 2,
    });
  });

  it("logAuditSafe no lanza cuando el repository falla, solo loggea", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockAuditLogRepo.create.mockRejectedValueOnce(new Error("FK violation simulada"));

    await expect(
      logAuditSafe({ userId: 1, action: "CREATE", entity: "EVENT", entityId: 5 }),
    ).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("logAuditSafe no loggea error cuando el repository escribe bien", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockAuditLogRepo.create.mockResolvedValueOnce({ id: 1 });

    await logAuditSafe({ userId: 1, action: "CREATE", entity: "EVENT", entityId: 5 });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

describe("audit-log: getAuditLogs (consulta)", () => {
  it("reenvia los filtros al repository sin modificarlos", async () => {
    mockAuditLogRepo.findMany.mockResolvedValueOnce([]);

    await getAuditLogs({ companyId: 7, entity: "EVENT" });

    expect(mockAuditLogRepo.findMany).toHaveBeenCalledWith({
      companyId: 7,
      entity: "EVENT",
    });
  });

  it("devuelve lo que el repository responda", async () => {
    const fakeLogs = [{ id: 1, action: "CREATE", entity: "EVENT" }];
    mockAuditLogRepo.findMany.mockResolvedValueOnce(fakeLogs);

    const result = await getAuditLogs({});

    expect(result).toEqual(fakeLogs);
  });
});

describe("audit-log: getAuditLogsHandler (scoping multi-tenant, antes imposible de probar)", () => {
  it("SUPER_ADMIN puede filtrar por cualquier companyId", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      userId: 1,
      role: "SUPER_ADMIN",
      companyId: null,
      expiresAt: new Date(),
    });
    mockAuditLogRepo.findMany.mockResolvedValueOnce([]);

    await getAuditLogsHandler({ companyId: 99 });

    expect(mockAuditLogRepo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 99 }),
    );
  });

  it("SUPER_ADMIN sin filtro ve todo (companyId undefined)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      userId: 1,
      role: "SUPER_ADMIN",
      companyId: null,
      expiresAt: new Date(),
    });
    mockAuditLogRepo.findMany.mockResolvedValueOnce([]);

    await getAuditLogsHandler();

    expect(mockAuditLogRepo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: undefined }),
    );
  });

  it("COMPANY_ADMIN queda forzado a su propia companyId aunque mande otra en el filtro", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      userId: 2,
      role: "COMPANY_ADMIN",
      companyId: 5,
      expiresAt: new Date(),
    });
    mockAuditLogRepo.findMany.mockResolvedValueOnce([]);

    await getAuditLogsHandler({ companyId: 99 });

    expect(mockAuditLogRepo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 5 }),
    );
  });

  it("sin sesion devuelve {success: false, error} en vez de lanzar", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new UnauthenticatedError("se requiere iniciar sesión"),
    );

    const result = await getAuditLogsHandler();

    expect(result).toEqual({ success: false, error: "se requiere iniciar sesión" });
    expect(mockAuditLogRepo.findMany).not.toHaveBeenCalled();
  });

  it("rol no autorizado (ej. PARTICIPANT) devuelve {success: false, error}", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new ForbiddenError("usuario no autorizado"),
    );

    const result = await getAuditLogsHandler();

    expect(result).toEqual({ success: false, error: "usuario no autorizado" });
  });
});
