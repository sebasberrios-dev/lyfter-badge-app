import { describe, it, expect, vi, beforeEach } from "vitest";

const mockBadgeRepo = vi.hoisted(() => ({
  findById: vi.fn(),
  findByQrToken: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

const mockGetEventById = vi.hoisted(() => vi.fn());
const mockLogAuditSafe = vi.hoisted(() => vi.fn());

vi.mock("@/modules/badges/badges.repository", () => ({
  BadgeRepository: vi.fn(function () {
    return mockBadgeRepo;
  }),
}));

vi.mock("@/modules/events/events.service", () => ({
  getEventById: mockGetEventById,
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
  createBadge,
  getBadgeById,
  getBadgeByQrToken,
  updateBadge,
  deleteBadge,
} from "@/modules/badges/badges.service";
import {
  createBadgeHandler,
  updateBadgeHandler,
  deleteBadgeHandler,
  getBadgesForEventHandler,
} from "@/modules/badges/badges.actions";
import {
  BadgeNotFoundError,
  DuplicateWelcomeBadgeError,
  BadgeCannotBeDeletedError,
} from "@/modules/badges/badges.errors";
import { EventNotFoundError } from "@/modules/events/events.errors";
import {
  requireAuth,
  requireRole,
  requireCompanyOwnership,
  UnauthenticatedError,
  ForbiddenError,
} from "@/lib/auth-guard";

beforeEach(() => {
  vi.resetAllMocks();
});

// createBadgeSchema exige "icon" como uno de una lista de valores (z.enum([]))
// que hoy esta vacia ("Iconos por definir" en badges.schema.ts) -- CUALQUIER
// valor de icon falla la validacion real. Confirmado con un script aparte.
// Es un bug real preexistente, no algo introducido por estos tests; el
// usuario confirmo dejarlo como esta y marcar como .todo lo que dependa de
// pasar esa validacion en createBadgeHandler (updateBadgeHandler no se ve
// afectado porque .partial() vuelve "icon" opcional).
const badgeDataForService: any = {
  name: "Badge de prueba",
  description: "Una descripcion con mas de veinte caracteres",
  xpValue: 10,
  icon: "star",
  type: "TALK",
  rarity: "COMMON",
};

describe("badges: createBadge (service)", () => {
  it("happy: crea el badge", async () => {
    // type:"TALK" no entra a la rama de deduplicacion de WELCOME, findMany no se llama
    mockBadgeRepo.create.mockResolvedValueOnce({
      id: 1,
      ...badgeDataForService,
      eventId: 10,
    });

    const result = await createBadge(10, badgeDataForService);

    expect(result.id).toBe(1);
  });

  it("unhappy: segundo badge WELCOME en el mismo evento -> DuplicateWelcomeBadgeError", async () => {
    mockBadgeRepo.findMany.mockResolvedValueOnce([{ id: 5, type: "WELCOME" }]);

    await expect(
      createBadge(10, { ...badgeDataForService, type: "WELCOME" }),
    ).rejects.toThrow(DuplicateWelcomeBadgeError);
    expect(mockBadgeRepo.create).not.toHaveBeenCalled();
  });
});

describe("badges: getBadgeById / getBadgeByQrToken (service)", () => {
  it("getBadgeById happy: devuelve el badge con event.companyId incluido", async () => {
    mockBadgeRepo.findById.mockResolvedValueOnce({
      id: 1,
      event: { companyId: 5 },
    });

    const result = await getBadgeById(1);

    expect(result.event.companyId).toBe(5);
  });

  it("getBadgeById unhappy: no encontrado -> BadgeNotFoundError", async () => {
    mockBadgeRepo.findById.mockResolvedValueOnce(null);

    await expect(getBadgeById(999)).rejects.toThrow(BadgeNotFoundError);
  });

  it("getBadgeByQrToken happy: devuelve el badge por su qrToken estatico", async () => {
    mockBadgeRepo.findByQrToken.mockResolvedValueOnce({
      id: 1,
      qrToken: "abc123",
    });

    const result = await getBadgeByQrToken("abc123");

    expect(result.qrToken).toBe("abc123");
  });

  it("getBadgeByQrToken unhappy: qrToken inexistente -> BadgeNotFoundError", async () => {
    mockBadgeRepo.findByQrToken.mockResolvedValueOnce(null);

    await expect(getBadgeByQrToken("no-existe")).rejects.toThrow(
      BadgeNotFoundError,
    );
  });
});

describe("badges: updateBadge (service)", () => {
  it("happy: actualiza el badge", async () => {
    mockBadgeRepo.findById.mockResolvedValueOnce({
      id: 1,
      eventId: 10,
      type: "TALK",
    });
    mockBadgeRepo.update.mockResolvedValueOnce({ id: 1, name: "Actualizado" });

    const result = await updateBadge(1, { name: "Actualizado" });

    expect(result.name).toBe("Actualizado");
  });

  it("unhappy: no encontrado -> BadgeNotFoundError", async () => {
    mockBadgeRepo.findById.mockResolvedValueOnce(null);

    await expect(updateBadge(999, { name: "x" })).rejects.toThrow(
      BadgeNotFoundError,
    );
  });

  it("unhappy: cambiar el tipo a WELCOME duplicando otro ya existente -> DuplicateWelcomeBadgeError", async () => {
    mockBadgeRepo.findById.mockResolvedValueOnce({
      id: 1,
      eventId: 10,
      type: "TALK",
    });
    mockBadgeRepo.findMany.mockResolvedValueOnce([
      { id: 2, type: "WELCOME" },
    ]);

    await expect(updateBadge(1, { type: "WELCOME" })).rejects.toThrow(
      DuplicateWelcomeBadgeError,
    );
    expect(mockBadgeRepo.update).not.toHaveBeenCalled();
  });
});

describe("badges: deleteBadge (service)", () => {
  it("happy: elimina un badge sin canjes asociados", async () => {
    mockBadgeRepo.findById.mockResolvedValueOnce({ id: 1 });
    mockBadgeRepo.delete.mockResolvedValueOnce({ id: 1 });

    const result = await deleteBadge(1);

    expect(result.id).toBe(1);
  });

  it("unhappy: badge con Redemption asociada -> BadgeCannotBeDeletedError", async () => {
    mockBadgeRepo.findById.mockResolvedValueOnce({ id: 1 });
    mockBadgeRepo.delete.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("constraint violated", {
        code: "P2039",
        clientVersion: "7.9.1",
      }),
    );

    await expect(deleteBadge(1)).rejects.toThrow(BadgeCannotBeDeletedError);
  });
});

describe("badges: getBadgesForEventHandler (action)", () => {
  it("happy: nunca incluye el qrToken en el resultado", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({
      userId: 1,
      role: "PARTICIPANT",
      companyId: null,
      expiresAt: new Date(),
    });
    mockBadgeRepo.findMany.mockResolvedValueOnce([
      { id: 1, name: "Badge A", eventId: 10, qrToken: "secreto-super-largo" },
      { id: 2, name: "Badge B", eventId: 10, qrToken: "otro-secreto" },
    ]);

    const result: any = await getBadgesForEventHandler(10);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    for (const badge of result.data) {
      expect(badge).not.toHaveProperty("qrToken");
    }
  });

  it("unhappy: sin sesion -> {success:false, error}", async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(
      new UnauthenticatedError("se requiere iniciar sesión"),
    );

    const result = await getBadgesForEventHandler(10);

    expect(result).toEqual({
      success: false,
      error: "se requiere iniciar sesión",
    });
  });
});

const superAdminSession = {
  userId: 1,
  role: "SUPER_ADMIN" as const,
  companyId: null,
  expiresAt: new Date(),
};

const companyAdminSession = {
  userId: 2,
  role: "COMPANY_ADMIN" as const,
  companyId: 5,
  expiresAt: new Date(),
};

describe("badges: createBadgeHandler (action)", () => {
  it.todo(
    "happy: SUPER_ADMIN crea el badge (bloqueado por el bug de icon:z.enum([]) en badges.schema.ts -- ver nota arriba)",
  );
  it.todo(
    "logAuditSafe llamado con action:CREATE, entity:BADGE (depende del mismo bloqueo que el caso happy)",
  );

  it("unhappy: evento no encontrado -> EventNotFoundError (ocurre antes de validar el body)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockGetEventById.mockRejectedValueOnce(new EventNotFoundError());

    const result = await createBadgeHandler(999999, badgeDataForService);

    expect(result).toEqual({ success: false, error: "evento no encontrado" });
  });

  it("unhappy: COMPANY_ADMIN de otra empresa -> ForbiddenError", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(companyAdminSession);
    mockGetEventById.mockResolvedValueOnce({ id: 10, companyId: 99 });
    vi.mocked(requireCompanyOwnership).mockRejectedValueOnce(
      new ForbiddenError("usuario no autorizado"),
    );

    const result = await createBadgeHandler(10, badgeDataForService);

    expect(result).toEqual({ success: false, error: "usuario no autorizado" });
    expect(mockBadgeRepo.create).not.toHaveBeenCalled();
  });

  it("unhappy: sin sesion -> {success:false, error}", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new UnauthenticatedError("se requiere iniciar sesión"),
    );

    const result = await createBadgeHandler(10, badgeDataForService);

    expect(result).toEqual({
      success: false,
      error: "se requiere iniciar sesión",
    });
  });

  it("unhappy: body invalido -> {success:false} con detalle de Zod", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockGetEventById.mockResolvedValueOnce({ id: 10, companyId: 5 });
    vi.mocked(requireCompanyOwnership).mockResolvedValueOnce(superAdminSession);

    const result: any = await createBadgeHandler(10, {
      ...badgeDataForService,
      name: "",
    });

    expect(result.success).toBe(false);
    expect(mockBadgeRepo.create).not.toHaveBeenCalled();
  });
});

describe("badges: updateBadgeHandler (action)", () => {
  it("happy: SUPER_ADMIN actualiza el badge (sin icon, .partial() lo vuelve opcional) y llama logAuditSafe", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    // findById se llama dos veces: una desde el handler (getBadgeById, para
    // requireCompanyOwnership) y otra desde dentro de updateBadge (service).
    mockBadgeRepo.findById.mockResolvedValue({
      id: 1,
      eventId: 10,
      type: "TALK",
      event: { companyId: 5 },
    });
    vi.mocked(requireCompanyOwnership).mockResolvedValueOnce(superAdminSession);
    mockBadgeRepo.update.mockResolvedValueOnce({ id: 1, name: "Actualizado" });

    const result = await updateBadgeHandler(1, { name: "Actualizado" });

    expect(result).toEqual({ success: true, data: { id: 1, name: "Actualizado" } });
    expect(mockLogAuditSafe).toHaveBeenCalledWith({
      userId: 1,
      action: "UPDATE",
      entity: "BADGE",
      entityId: 1,
      companyId: 5,
      eventId: 10,
    });
  });

  it("unhappy: badge no encontrado -> BadgeNotFoundError", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockBadgeRepo.findById.mockResolvedValueOnce(null);

    const result = await updateBadgeHandler(999, { name: "x" });

    expect(result).toEqual({ success: false, error: "badge no encontrado" });
  });

  it("unhappy: COMPANY_ADMIN de otra empresa -> ForbiddenError", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(companyAdminSession);
    mockBadgeRepo.findById.mockResolvedValueOnce({
      id: 1,
      eventId: 10,
      event: { companyId: 99 },
    });
    vi.mocked(requireCompanyOwnership).mockRejectedValueOnce(
      new ForbiddenError("usuario no autorizado"),
    );

    const result = await updateBadgeHandler(1, { name: "x" });

    expect(result).toEqual({ success: false, error: "usuario no autorizado" });
    expect(mockBadgeRepo.update).not.toHaveBeenCalled();
  });

  it("unhappy: sin sesion -> {success:false, error}", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new UnauthenticatedError("se requiere iniciar sesión"),
    );

    const result = await updateBadgeHandler(1, { name: "x" });

    expect(result).toEqual({
      success: false,
      error: "se requiere iniciar sesión",
    });
  });
});

describe("badges: deleteBadgeHandler (action)", () => {
  it("happy: SUPER_ADMIN elimina el badge y llama logAuditSafe con action:DELETE", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockBadgeRepo.findById.mockResolvedValue({
      id: 1,
      eventId: 10,
      event: { companyId: 5 },
    });
    vi.mocked(requireCompanyOwnership).mockResolvedValueOnce(superAdminSession);
    mockBadgeRepo.delete.mockResolvedValueOnce({ id: 1 });

    const result = await deleteBadgeHandler(1);

    expect(result).toEqual({ success: true, data: { id: 1 } });
    expect(mockLogAuditSafe).toHaveBeenCalledWith({
      userId: 1,
      action: "DELETE",
      entity: "BADGE",
      entityId: 1,
      companyId: 5,
      eventId: 10,
    });
  });

  it("unhappy: COMPANY_ADMIN de otra empresa -> ForbiddenError", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(companyAdminSession);
    mockBadgeRepo.findById.mockResolvedValueOnce({
      id: 1,
      eventId: 10,
      event: { companyId: 99 },
    });
    vi.mocked(requireCompanyOwnership).mockRejectedValueOnce(
      new ForbiddenError("usuario no autorizado"),
    );

    const result = await deleteBadgeHandler(1);

    expect(result).toEqual({ success: false, error: "usuario no autorizado" });
    expect(mockBadgeRepo.delete).not.toHaveBeenCalled();
  });

  it("unhappy: sin sesion -> {success:false, error}", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new UnauthenticatedError("se requiere iniciar sesión"),
    );

    const result = await deleteBadgeHandler(1);

    expect(result).toEqual({
      success: false,
      error: "se requiere iniciar sesión",
    });
  });

  it("unhappy: badge con canjes asociados -> BadgeCannotBeDeletedError", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockBadgeRepo.findById.mockResolvedValue({
      id: 1,
      eventId: 10,
      event: { companyId: 5 },
    });
    vi.mocked(requireCompanyOwnership).mockResolvedValueOnce(superAdminSession);
    mockBadgeRepo.delete.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("constraint violated", {
        code: "P2039",
        clientVersion: "7.9.1",
      }),
    );

    const result = await deleteBadgeHandler(1);

    expect(result).toEqual({
      success: false,
      error: "no se pudo eliminar el badge porque tiene canjes asociados",
    });
  });
});
