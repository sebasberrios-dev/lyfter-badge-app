import { describe, it, expect, vi, beforeEach } from "vitest";

const mockEventRepo = vi.hoisted(() => ({
  findById: vi.fn(),
  findMany: vi.fn(),
  findManyPaginated: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

const mockLogAuditSafe = vi.hoisted(() => vi.fn());

vi.mock("@/modules/events/events.repository", () => ({
  EventRepository: vi.fn(function () {
    return mockEventRepo;
  }),
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
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
  finishEvent,
  getAllEventsPaginated,
} from "@/modules/events/events.service";
import {
  createEventHandler,
  updateEventHandler,
  deleteEventHandler,
  getEventByIdHandler,
  finishEventHandler,
  adminsGetEventsPaginatedHandler,
} from "@/modules/events/events.actions";
import {
  EventNotFoundError,
  InvalidEventDatesError,
  EventCannotBeDeletedError,
  EventAlreadyFinishedError,
} from "@/modules/events/events.errors";
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

const validEventInput = {
  name: "Evento de prueba",
  description: "Descripcion con al menos veinte caracteres",
  location: "San Jose",
  country: "Costa Rica",
  modality: "VIRTUAL" as const,
  startDate: new Date("2026-01-01T10:00:00Z"),
  endDate: new Date("2026-01-01T18:00:00Z"),
};

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

describe("events: createEvent (service)", () => {
  it("happy: crea el evento", async () => {
    mockEventRepo.create.mockResolvedValueOnce({
      id: 1,
      ...validEventInput,
      companyId: 5,
    });

    const result = await createEvent(validEventInput, 5);

    expect(result.id).toBe(1);
    expect(mockEventRepo.create).toHaveBeenCalledWith({
      ...validEventInput,
      companyId: 5,
    });
  });

  it("unhappy: fecha de fin antes que la de inicio -> InvalidEventDatesError", async () => {
    const badInput = {
      ...validEventInput,
      startDate: new Date("2026-01-02"),
      endDate: new Date("2026-01-01"),
    };

    await expect(createEvent(badInput, 5)).rejects.toThrow(
      InvalidEventDatesError,
    );
    expect(mockEventRepo.create).not.toHaveBeenCalled();
  });
});

describe("events: getEventById (service)", () => {
  it("happy: devuelve el evento", async () => {
    mockEventRepo.findById.mockResolvedValueOnce({ id: 1, name: "Evento" });

    const result = await getEventById(1);

    expect(result.id).toBe(1);
  });

  it("unhappy: no encontrado -> EventNotFoundError", async () => {
    mockEventRepo.findById.mockResolvedValueOnce(null);

    await expect(getEventById(999)).rejects.toThrow(EventNotFoundError);
  });
});

describe("events: updateEvent (service)", () => {
  it("happy: actualiza el evento", async () => {
    mockEventRepo.findById.mockResolvedValueOnce({ id: 1, ...validEventInput });
    mockEventRepo.update.mockResolvedValueOnce({
      id: 1,
      ...validEventInput,
      name: "Nuevo nombre",
    });

    const result = await updateEvent(1, { name: "Nuevo nombre" });

    expect(result.name).toBe("Nuevo nombre");
  });

  it("unhappy: no encontrado -> EventNotFoundError", async () => {
    mockEventRepo.findById.mockResolvedValueOnce(null);

    await expect(updateEvent(999, { name: "x" })).rejects.toThrow(
      EventNotFoundError,
    );
  });

  it("unhappy: fechas invalidas -> InvalidEventDatesError", async () => {
    mockEventRepo.findById.mockResolvedValueOnce({ id: 1, ...validEventInput });

    await expect(
      updateEvent(1, {
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-01-01"),
      }),
    ).rejects.toThrow(InvalidEventDatesError);
  });
});

describe("events: deleteEvent (service)", () => {
  it("happy: elimina un evento sin badges ni participantes", async () => {
    mockEventRepo.findById.mockResolvedValueOnce({ id: 1, companyId: 5 });
    mockEventRepo.delete.mockResolvedValueOnce({ id: 1, companyId: 5 });

    const result = await deleteEvent(1);

    expect(result.id).toBe(1);
  });

  it("unhappy: evento con badges/participantes asociados -> EventCannotBeDeletedError", async () => {
    mockEventRepo.findById.mockResolvedValueOnce({ id: 1, companyId: 5 });
    mockEventRepo.delete.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("constraint violated", {
        code: "P2039",
        clientVersion: "7.9.1",
      }),
    );

    await expect(deleteEvent(1)).rejects.toThrow(EventCannotBeDeletedError);
  });
});

describe("events: getEventByIdHandler (action)", () => {
  const participantSession = {
    userId: 1,
    role: "PARTICIPANT" as const,
    companyId: null,
    expiresAt: new Date(),
  };

  it("happy: evento ACTIVE se devuelve normalmente", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(participantSession);
    mockEventRepo.findById.mockResolvedValueOnce({ id: 1, status: "ACTIVE" });

    const result = await getEventByIdHandler(1);

    expect(result).toEqual({ success: true, data: { id: 1, status: "ACTIVE" } });
  });

  it("happy: evento FINISHED tambien se devuelve", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(participantSession);
    mockEventRepo.findById.mockResolvedValueOnce({ id: 1, status: "FINISHED" });

    const result = await getEventByIdHandler(1);

    expect(result.success).toBe(true);
  });

  it("unhappy: evento en DRAFT se trata como no encontrado (no se filtra solo en UI)", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(participantSession);
    mockEventRepo.findById.mockResolvedValueOnce({ id: 1, status: "DRAFT" });

    const result = await getEventByIdHandler(1);

    expect(result).toEqual({ success: false, error: "evento no encontrado" });
  });

  it("unhappy: evento inexistente -> EventNotFoundError", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(participantSession);
    mockEventRepo.findById.mockResolvedValueOnce(null);

    const result = await getEventByIdHandler(999999);

    expect(result).toEqual({ success: false, error: "evento no encontrado" });
  });

  it("unhappy: sin sesion -> {success:false, error}", async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(
      new UnauthenticatedError("se requiere iniciar sesión"),
    );

    const result = await getEventByIdHandler(1);

    expect(result).toEqual({
      success: false,
      error: "se requiere iniciar sesión",
    });
  });
});

describe("events: createEventHandler (action)", () => {
  it("happy: SUPER_ADMIN crea evento en cualquier empresa", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    vi.mocked(requireCompanyOwnership).mockResolvedValueOnce(superAdminSession);
    mockEventRepo.create.mockResolvedValueOnce({
      id: 10,
      ...validEventInput,
      companyId: 5,
    });

    const result = await createEventHandler(validEventInput, 5);

    expect(result.success).toBe(true);
    expect(mockLogAuditSafe).toHaveBeenCalledWith({
      userId: 1,
      action: "CREATE",
      entity: "EVENT",
      entityId: 10,
      companyId: 5,
      eventId: 10,
    });
  });

  it("happy: COMPANY_ADMIN crea evento en su propia empresa", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(companyAdminSession);
    vi.mocked(requireCompanyOwnership).mockResolvedValueOnce(companyAdminSession);
    mockEventRepo.create.mockResolvedValueOnce({
      id: 11,
      ...validEventInput,
      companyId: 5,
    });

    const result = await createEventHandler(validEventInput, 5);

    expect(result.success).toBe(true);
  });

  it("unhappy: COMPANY_ADMIN de otra empresa -> ForbiddenError", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(companyAdminSession);
    vi.mocked(requireCompanyOwnership).mockRejectedValueOnce(
      new ForbiddenError("usuario no autorizado"),
    );

    const result = await createEventHandler(validEventInput, 99);

    expect(result).toEqual({ success: false, error: "usuario no autorizado" });
    expect(mockEventRepo.create).not.toHaveBeenCalled();
  });

  it("unhappy: sin sesion -> {success:false, error}", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new UnauthenticatedError("se requiere iniciar sesión"),
    );

    const result = await createEventHandler(validEventInput, 5);

    expect(result).toEqual({
      success: false,
      error: "se requiere iniciar sesión",
    });
  });

  it("unhappy: body invalido -> detalle de Zod, sin llamar al service", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    vi.mocked(requireCompanyOwnership).mockResolvedValueOnce(superAdminSession);

    const result: any = await createEventHandler(
      { ...validEventInput, name: "" },
      5,
    );

    expect(result.success).toBe(false);
    expect(mockEventRepo.create).not.toHaveBeenCalled();
  });
});

describe("events: updateEventHandler (action)", () => {
  it("happy: actualiza el evento y llama logAuditSafe con action:UPDATE", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    // findById se llama dos veces en el flujo real: una desde el handler
    // (getEventById, para requireCompanyOwnership) y otra desde dentro del
    // service updateEvent (su propio chequeo de existencia).
    mockEventRepo.findById.mockResolvedValue({
      id: 1,
      ...validEventInput,
      companyId: 5,
    });
    vi.mocked(requireCompanyOwnership).mockResolvedValueOnce(superAdminSession);
    mockEventRepo.update.mockResolvedValueOnce({
      id: 1,
      ...validEventInput,
      name: "Actualizado",
      companyId: 5,
    });

    const result = await updateEventHandler(1, { name: "Actualizado" });

    expect(result.success).toBe(true);
    expect(mockLogAuditSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATE",
        entity: "EVENT",
        entityId: 1,
        companyId: 5,
        eventId: 1,
      }),
    );
  });

  it("unhappy: evento no encontrado -> EventNotFoundError", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockEventRepo.findById.mockResolvedValueOnce(null);

    const result = await updateEventHandler(999, { name: "x" });

    expect(result).toEqual({ success: false, error: "evento no encontrado" });
  });
});

describe("events: deleteEventHandler (action)", () => {
  it("happy: SUPER_ADMIN elimina el evento", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockEventRepo.findById.mockResolvedValueOnce({ id: 1, companyId: 5 });
    mockEventRepo.delete.mockResolvedValueOnce({ id: 1, companyId: 5 });

    const result = await deleteEventHandler(1);

    expect(result.success).toBe(true);
    expect(mockLogAuditSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "DELETE",
        entity: "EVENT",
        entityId: 1,
        companyId: 5,
        eventId: 1,
      }),
    );
  });

  it("unhappy: COMPANY_ADMIN no puede eliminar directamente (requireRole solo permite SUPER_ADMIN)", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new ForbiddenError("usuario no autorizado"),
    );

    const result = await deleteEventHandler(1);

    expect(result).toEqual({ success: false, error: "usuario no autorizado" });
    expect(mockEventRepo.delete).not.toHaveBeenCalled();
  });
});

describe("events: finishEvent (service)", () => {
  it("happy: pasa el evento a FINISHED", async () => {
    mockEventRepo.findById.mockResolvedValueOnce({ id: 1, status: "ACTIVE" });
    mockEventRepo.update.mockResolvedValueOnce({ id: 1, status: "FINISHED" });

    const result = await finishEvent(1);

    expect(result.status).toBe("FINISHED");
    expect(mockEventRepo.update).toHaveBeenCalledWith(1, { status: "FINISHED" });
  });

  it("unhappy: evento no encontrado -> EventNotFoundError", async () => {
    mockEventRepo.findById.mockResolvedValueOnce(null);

    await expect(finishEvent(999)).rejects.toThrow(EventNotFoundError);
  });

  it("unhappy: evento ya finalizado -> EventAlreadyFinishedError", async () => {
    mockEventRepo.findById.mockResolvedValueOnce({ id: 1, status: "FINISHED" });

    await expect(finishEvent(1)).rejects.toThrow(EventAlreadyFinishedError);
    expect(mockEventRepo.update).not.toHaveBeenCalled();
  });
});

describe("events: finishEventHandler (action)", () => {
  it("happy: SUPER_ADMIN finaliza cualquier evento", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    // findById se llama dos veces: una desde el handler (getEventById, para
    // requireCompanyOwnership) y otra desde dentro de finishEvent (service).
    mockEventRepo.findById.mockResolvedValue({ id: 1, status: "ACTIVE", companyId: 5 });
    vi.mocked(requireCompanyOwnership).mockResolvedValueOnce(superAdminSession);
    mockEventRepo.update.mockResolvedValueOnce({ id: 1, status: "FINISHED", companyId: 5 });

    const result = await finishEventHandler(1);

    expect(result.success).toBe(true);
    expect(mockLogAuditSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATE",
        entity: "EVENT",
        entityId: 1,
        companyId: 5,
        eventId: 1,
      }),
    );
  });

  it("happy: COMPANY_ADMIN finaliza su propio evento", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(companyAdminSession);
    mockEventRepo.findById.mockResolvedValue({ id: 1, status: "ACTIVE", companyId: 5 });
    vi.mocked(requireCompanyOwnership).mockResolvedValueOnce(companyAdminSession);
    mockEventRepo.update.mockResolvedValueOnce({ id: 1, status: "FINISHED", companyId: 5 });

    const result = await finishEventHandler(1);

    expect(result.success).toBe(true);
  });

  it("unhappy: COMPANY_ADMIN de otra empresa -> ForbiddenError", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(companyAdminSession);
    mockEventRepo.findById.mockResolvedValueOnce({ id: 1, status: "ACTIVE", companyId: 99 });
    vi.mocked(requireCompanyOwnership).mockRejectedValueOnce(
      new ForbiddenError("usuario no autorizado"),
    );

    const result = await finishEventHandler(1);

    expect(result).toEqual({ success: false, error: "usuario no autorizado" });
    expect(mockEventRepo.update).not.toHaveBeenCalled();
  });

  it("unhappy: evento ya finalizado -> EventAlreadyFinishedError", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockEventRepo.findById.mockResolvedValue({ id: 1, status: "FINISHED", companyId: 5 });
    vi.mocked(requireCompanyOwnership).mockResolvedValueOnce(superAdminSession);

    const result = await finishEventHandler(1);

    expect(result).toEqual({ success: false, error: "el evento ya está finalizado" });
  });
});

describe("events: getAllEventsPaginated (service)", () => {
  it("happy: delega en el repository con paginacion", async () => {
    mockEventRepo.findManyPaginated.mockResolvedValueOnce({
      events: [{ id: 1 }],
      total: 1,
    });

    const result = await getAllEventsPaginated({}, 1, 20);

    expect(result.total).toBe(1);
    expect(mockEventRepo.findManyPaginated).toHaveBeenCalledWith({}, 1, 20);
  });
});

describe("events: adminsGetEventsPaginatedHandler (action)", () => {
  it("happy: SUPER_ADMIN puede filtrar por cualquier empresa", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockEventRepo.findManyPaginated.mockResolvedValueOnce({
      events: [{ id: 1, companyId: 7 }],
      total: 1,
    });

    const result = await adminsGetEventsPaginatedHandler({ companyId: 7 }, 1, 20);

    expect(result.success).toBe(true);
    expect(mockEventRepo.findManyPaginated).toHaveBeenCalledWith(
      { companyId: 7 },
      1,
      20,
    );
  });

  it("happy: COMPANY_ADMIN queda forzado a su propia empresa", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(companyAdminSession);
    mockEventRepo.findManyPaginated.mockResolvedValueOnce({ events: [], total: 0 });

    await adminsGetEventsPaginatedHandler({ companyId: 99 }, 1, 20);

    expect(mockEventRepo.findManyPaginated).toHaveBeenCalledWith(
      { companyId: 5 },
      1,
      20,
    );
  });

  it("unhappy: sin sesion -> {success:false, error}", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new UnauthenticatedError("se requiere iniciar sesión"),
    );

    const result = await adminsGetEventsPaginatedHandler();

    expect(result).toEqual({
      success: false,
      error: "se requiere iniciar sesión",
    });
  });
});
