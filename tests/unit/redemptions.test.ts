import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedemptionRepo = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
  findRegistration: vi.fn(),
  findRegistrationsByUser: vi.fn(),
  findRegistrationsByEvent: vi.fn(),
  countRedeemedByEvent: vi.fn(),
  redeemAtomic: vi.fn(),
  countRedeemedInEvent: vi.fn(),
}));

const mockGetBadgeById = vi.hoisted(() => vi.fn());
const mockGetBadgesByField = vi.hoisted(() => vi.fn());
const mockGetEventById = vi.hoisted(() => vi.fn());

vi.mock("@/modules/redemptions/redemptions.repository", () => ({
  RedemptionRepository: vi.fn(function () {
    return mockRedemptionRepo;
  }),
}));

vi.mock("@/modules/badges/badges.service", () => ({
  getBadgeById: mockGetBadgeById,
  getBadgesByField: mockGetBadgesByField,
}));

vi.mock("@/modules/events/events.service", () => ({
  getEventById: mockGetEventById,
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

// lib/qr-token.ts (firma/verifica JWT) y lib/geolocation.ts (Haversine) NO se
// mockean -- son criptografia/matematica pura sin DB, dejarlos reales le da
// valor genuino a estos tests (tokens firmados/verificados de verdad).
import { signQrToken } from "@/lib/qr-token";
import {
  redeemBadge,
  getMyRedemptions,
  getUserRegisteredEvents,
  getEventParticipants,
  getEventMetrics,
} from "@/modules/redemptions/redemptions.service";
import {
  getMyRedemptionsHandler,
  getMyRegisteredEventsHandler,
  adminsGetEventParticipantsHandler,
  adminsGetEventMetricsHandler,
} from "@/modules/redemptions/redemptions.actions";
import {
  InvalidTokenError,
  ExpiredTokenError,
  BadgeDoesNotMatchEventError,
  EventNotStartedError,
  EventAlreadyEndedError,
  UserNotRegisteredToEventError,
} from "@/modules/redemptions/redemptions.errors";
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
  // Por defecto, sin badges de evento cargados -> eventCompleted:false. Los
  // tests de completitud pisan esto explícitamente con mockResolvedValueOnce.
  mockGetBadgesByField.mockResolvedValue([]);
  mockRedemptionRepo.countRedeemedInEvent.mockResolvedValue(0);
});

const now = new Date();

const activeEvent = {
  id: 100,
  companyId: 1,
  status: "ACTIVE" as const,
  startDate: new Date(now.getTime() - 60 * 60 * 1000),
  endDate: new Date(now.getTime() + 60 * 60 * 1000),
  modality: "VIRTUAL" as const,
  latitude: null as number | null,
  longitude: null as number | null,
};

function makeBadge(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: "Badge de prueba",
    description: "desc",
    icon: "star",
    type: "TALK",
    rarity: "COMMON",
    xpValue: 20,
    eventId: 100,
    ...overrides,
  };
}

describe("redemptions: redeemBadge - happy paths", () => {
  it("badge WELCOME: inscribe al usuario al evento y otorga XP (no consulta findRegistration)", async () => {
    const badge = makeBadge({ id: 1, type: "WELCOME", xpValue: 10 });
    const token = await signQrToken({ badgeId: badge.id, eventId: badge.eventId });
    mockGetBadgeById.mockResolvedValueOnce(badge);
    mockGetEventById.mockResolvedValueOnce(activeEvent);
    mockRedemptionRepo.redeemAtomic.mockResolvedValueOnce({
      alreadyRedeemed: false,
      redemption: { id: 1 },
      newTotalXp: 10,
      newEventXp: 10,
    });

    const result = await redeemBadge(1, token);

    expect(result.alreadyRedeemed).toBe(false);
    expect(mockRedemptionRepo.findRegistration).not.toHaveBeenCalled();
    expect(mockRedemptionRepo.redeemAtomic).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, badgeId: 1, isWelcomeBadge: true }),
    );
  });

  it("badge de charla/stand con usuario ya inscrito: otorga XP", async () => {
    const badge = makeBadge({ id: 2, type: "TALK", xpValue: 20 });
    const token = await signQrToken({ badgeId: badge.id, eventId: badge.eventId });
    mockGetBadgeById.mockResolvedValueOnce(badge);
    mockGetEventById.mockResolvedValueOnce(activeEvent);
    mockRedemptionRepo.findRegistration.mockResolvedValueOnce({
      userId: 1,
      eventId: 100,
    });
    mockRedemptionRepo.redeemAtomic.mockResolvedValueOnce({
      alreadyRedeemed: false,
      redemption: { id: 2 },
      newTotalXp: 30,
      newEventXp: 30,
    });

    const result: any = await redeemBadge(1, token);

    expect(result.alreadyRedeemed).toBe(false);
    expect(result.xpAwarded).toBe(20);
  });

  it("idempotencia: repetir el mismo canje devuelve alreadyRedeemed:true sin campos de XP", async () => {
    const badge = makeBadge({ id: 2, type: "TALK" });
    const token = await signQrToken({ badgeId: badge.id, eventId: badge.eventId });
    mockGetBadgeById.mockResolvedValueOnce(badge);
    mockGetEventById.mockResolvedValueOnce(activeEvent);
    mockRedemptionRepo.findRegistration.mockResolvedValueOnce({ userId: 1 });
    mockRedemptionRepo.redeemAtomic.mockResolvedValueOnce({
      alreadyRedeemed: true,
    });

    const result = await redeemBadge(1, token);

    expect(result).toEqual({ alreadyRedeemed: true, badge: expect.any(Object) });
  });

  it("level/leveledUp: cruzar el umbral de 100 xp -> leveledUp:true, level correcto", async () => {
    const badge = makeBadge({ id: 2, type: "TALK", xpValue: 20 });
    const token = await signQrToken({ badgeId: badge.id, eventId: badge.eventId });
    mockGetBadgeById.mockResolvedValueOnce(badge);
    mockGetEventById.mockResolvedValueOnce(activeEvent);
    mockRedemptionRepo.findRegistration.mockResolvedValueOnce({ userId: 1 });
    // newTotalXp:115, xpValue:20 -> xpBefore:95 (nivel 1) -> newTotalXp:115 (nivel 2)
    mockRedemptionRepo.redeemAtomic.mockResolvedValueOnce({
      alreadyRedeemed: false,
      redemption: { id: 2 },
      newTotalXp: 115,
      newEventXp: 115,
    });

    const result: any = await redeemBadge(1, token);

    expect(result.leveledUp).toBe(true);
    expect(result.level.level).toBe(2);
  });

  it("level/leveledUp: sin cruzar umbral -> leveledUp:false", async () => {
    const badge = makeBadge({ id: 2, type: "TALK", xpValue: 5 });
    const token = await signQrToken({ badgeId: badge.id, eventId: badge.eventId });
    mockGetBadgeById.mockResolvedValueOnce(badge);
    mockGetEventById.mockResolvedValueOnce(activeEvent);
    mockRedemptionRepo.findRegistration.mockResolvedValueOnce({ userId: 1 });
    // newTotalXp:95, xpValue:5 -> xpBefore:90, ambos nivel 1
    mockRedemptionRepo.redeemAtomic.mockResolvedValueOnce({
      alreadyRedeemed: false,
      redemption: { id: 2 },
      newTotalXp: 95,
      newEventXp: 95,
    });

    const result: any = await redeemBadge(1, token);

    expect(result.leveledUp).toBe(false);
    expect(result.level.level).toBe(1);
  });
});

describe("redemptions: redeemBadge - completitud del evento y premio", () => {
  it("canje que completa el evento -> eventCompleted:true, prizeDescription presente", async () => {
    const badge = makeBadge({ id: 2, type: "TALK", xpValue: 20 });
    const token = await signQrToken({ badgeId: badge.id, eventId: badge.eventId });
    mockGetBadgeById.mockResolvedValueOnce(badge);
    mockGetEventById.mockResolvedValueOnce({
      ...activeEvent,
      prizeDescription: "Una laptop",
    });
    mockRedemptionRepo.findRegistration.mockResolvedValueOnce({ userId: 1 });
    mockRedemptionRepo.redeemAtomic.mockResolvedValueOnce({
      alreadyRedeemed: false,
      redemption: { id: 2 },
      newTotalXp: 30,
      newEventXp: 30,
    });
    mockGetBadgesByField.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    mockRedemptionRepo.countRedeemedInEvent.mockResolvedValueOnce(2);

    const result: any = await redeemBadge(1, token);

    expect(result.eventCompleted).toBe(true);
    expect(result.prizeDescription).toBe("Una laptop");
  });

  it("canje que no completa el evento -> eventCompleted:false, prizeDescription:null", async () => {
    const badge = makeBadge({ id: 2, type: "TALK", xpValue: 20 });
    const token = await signQrToken({ badgeId: badge.id, eventId: badge.eventId });
    mockGetBadgeById.mockResolvedValueOnce(badge);
    mockGetEventById.mockResolvedValueOnce({
      ...activeEvent,
      prizeDescription: "Una laptop",
    });
    mockRedemptionRepo.findRegistration.mockResolvedValueOnce({ userId: 1 });
    mockRedemptionRepo.redeemAtomic.mockResolvedValueOnce({
      alreadyRedeemed: false,
      redemption: { id: 2 },
      newTotalXp: 30,
      newEventXp: 30,
    });
    mockGetBadgesByField.mockResolvedValueOnce([{ id: 1 }, { id: 2 }, { id: 3 }]);
    mockRedemptionRepo.countRedeemedInEvent.mockResolvedValueOnce(2);

    const result: any = await redeemBadge(1, token);

    expect(result.eventCompleted).toBe(false);
    expect(result.prizeDescription).toBeNull();
  });

  it("evento sin prizeDescription configurado que igual se completa -> eventCompleted:true, prizeDescription:null", async () => {
    const badge = makeBadge({ id: 2, type: "TALK", xpValue: 20 });
    const token = await signQrToken({ badgeId: badge.id, eventId: badge.eventId });
    mockGetBadgeById.mockResolvedValueOnce(badge);
    mockGetEventById.mockResolvedValueOnce({
      ...activeEvent,
      prizeDescription: null,
    });
    mockRedemptionRepo.findRegistration.mockResolvedValueOnce({ userId: 1 });
    mockRedemptionRepo.redeemAtomic.mockResolvedValueOnce({
      alreadyRedeemed: false,
      redemption: { id: 2 },
      newTotalXp: 30,
      newEventXp: 30,
    });
    mockGetBadgesByField.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    mockRedemptionRepo.countRedeemedInEvent.mockResolvedValueOnce(2);

    const result: any = await redeemBadge(1, token);

    expect(result.eventCompleted).toBe(true);
    expect(result.prizeDescription).toBeNull();
  });
});

describe("redemptions: redeemBadge - token invalido/expirado", () => {
  it("token con firma invalida -> InvalidTokenError", async () => {
    await expect(
      redeemBadge(1, "esto-no-es-un-jwt-valido"),
    ).rejects.toThrow(InvalidTokenError);
    expect(mockGetBadgeById).not.toHaveBeenCalled();
  });

  it("token expirado -> ExpiredTokenError (distinto de invalido)", async () => {
    const badge = makeBadge();
    const token = await signQrToken(
      { badgeId: badge.id, eventId: badge.eventId },
      "1s",
    );
    await new Promise((resolve) => setTimeout(resolve, 1200));

    await expect(redeemBadge(1, token)).rejects.toThrow(ExpiredTokenError);
  }, 3000);

  it("badge del token no corresponde al eventId del token -> BadgeDoesNotMatchEventError", async () => {
    const badge = makeBadge({ id: 1, eventId: 999 });
    const token = await signQrToken({ badgeId: 1, eventId: 100 });
    mockGetBadgeById.mockResolvedValueOnce(badge);

    await expect(redeemBadge(1, token)).rejects.toThrow(
      BadgeDoesNotMatchEventError,
    );
    expect(mockGetEventById).not.toHaveBeenCalled();
  });
});

describe("redemptions: redeemBadge - estado del evento", () => {
  it("evento en DRAFT -> EventNotStartedError (aunque la fecha caiga dentro del rango)", async () => {
    const badge = makeBadge();
    const token = await signQrToken({ badgeId: badge.id, eventId: badge.eventId });
    mockGetBadgeById.mockResolvedValueOnce(badge);
    mockGetEventById.mockResolvedValueOnce({ ...activeEvent, status: "DRAFT" });

    await expect(redeemBadge(1, token)).rejects.toThrow(EventNotStartedError);
  });

  it("antes de startDate -> EventNotStartedError", async () => {
    const badge = makeBadge();
    const token = await signQrToken({ badgeId: badge.id, eventId: badge.eventId });
    mockGetBadgeById.mockResolvedValueOnce(badge);
    mockGetEventById.mockResolvedValueOnce({
      ...activeEvent,
      startDate: new Date(now.getTime() + 60 * 60 * 1000),
    });

    await expect(redeemBadge(1, token)).rejects.toThrow(EventNotStartedError);
  });

  it("despues de endDate -> EventAlreadyEndedError", async () => {
    const badge = makeBadge();
    const token = await signQrToken({ badgeId: badge.id, eventId: badge.eventId });
    mockGetBadgeById.mockResolvedValueOnce(badge);
    mockGetEventById.mockResolvedValueOnce({
      ...activeEvent,
      endDate: new Date(now.getTime() - 60 * 60 * 1000),
    });

    await expect(redeemBadge(1, token)).rejects.toThrow(EventAlreadyEndedError);
  });

  it("evento con status FINISHED -> EventAlreadyEndedError", async () => {
    const badge = makeBadge();
    const token = await signQrToken({ badgeId: badge.id, eventId: badge.eventId });
    mockGetBadgeById.mockResolvedValueOnce(badge);
    mockGetEventById.mockResolvedValueOnce({ ...activeEvent, status: "FINISHED" });

    await expect(redeemBadge(1, token)).rejects.toThrow(EventAlreadyEndedError);
  });
});

describe("redemptions: redeemBadge - inscripcion", () => {
  it("badge que no es WELCOME y usuario no inscrito -> UserNotRegisteredToEventError", async () => {
    const badge = makeBadge({ type: "TALK" });
    const token = await signQrToken({ badgeId: badge.id, eventId: badge.eventId });
    mockGetBadgeById.mockResolvedValueOnce(badge);
    mockGetEventById.mockResolvedValueOnce(activeEvent);
    mockRedemptionRepo.findRegistration.mockResolvedValueOnce(null);

    await expect(redeemBadge(1, token)).rejects.toThrow(
      UserNotRegisteredToEventError,
    );
    expect(mockRedemptionRepo.redeemAtomic).not.toHaveBeenCalled();
  });
});

describe("redemptions: redeemBadge - geolocalizacion", () => {
  const onsiteEvent = {
    ...activeEvent,
    modality: "ONSITE" as const,
    latitude: 9.9281,
    longitude: -84.0907,
  };

  it("evento onsite, geoCoords dentro del radio de 150m -> flagged:false", async () => {
    const badge = makeBadge({ type: "TALK" });
    const token = await signQrToken({ badgeId: badge.id, eventId: badge.eventId });
    mockGetBadgeById.mockResolvedValueOnce(badge);
    mockGetEventById.mockResolvedValueOnce(onsiteEvent);
    mockRedemptionRepo.findRegistration.mockResolvedValueOnce({ userId: 1 });
    mockRedemptionRepo.redeemAtomic.mockImplementationOnce(async (params: any) => ({
      alreadyRedeemed: false,
      redemption: { id: 1, flagged: params.flagged },
      newTotalXp: 20,
      newEventXp: 20,
    }));

    const result: any = await redeemBadge(1, token, {
      lat: 9.9281,
      lon: -84.0907,
    });

    expect(result.flagged).toBe(false);
  });

  it("evento onsite, geoCoords fuera del radio -> flagged:true, pero el canje SI se completa", async () => {
    const badge = makeBadge({ type: "TALK" });
    const token = await signQrToken({ badgeId: badge.id, eventId: badge.eventId });
    mockGetBadgeById.mockResolvedValueOnce(badge);
    mockGetEventById.mockResolvedValueOnce(onsiteEvent);
    mockRedemptionRepo.findRegistration.mockResolvedValueOnce({ userId: 1 });
    mockRedemptionRepo.redeemAtomic.mockImplementationOnce(async (params: any) => ({
      alreadyRedeemed: false,
      redemption: { id: 1, flagged: params.flagged },
      newTotalXp: 20,
      newEventXp: 20,
    }));

    // ~1km al norte del evento -- muy fuera del radio de 150m
    const result: any = await redeemBadge(1, token, { lat: 9.9371, lon: -84.0907 });

    expect(result.flagged).toBe(true);
    expect(result.alreadyRedeemed).toBe(false);
  });

  it("evento virtual: se ignora la geolocalizacion aunque este 'fuera de rango'", async () => {
    const badge = makeBadge({ type: "TALK" });
    const token = await signQrToken({ badgeId: badge.id, eventId: badge.eventId });
    mockGetBadgeById.mockResolvedValueOnce(badge);
    mockGetEventById.mockResolvedValueOnce({
      ...onsiteEvent,
      modality: "VIRTUAL",
    });
    mockRedemptionRepo.findRegistration.mockResolvedValueOnce({ userId: 1 });
    mockRedemptionRepo.redeemAtomic.mockResolvedValueOnce({
      alreadyRedeemed: false,
      redemption: { id: 1 },
      newTotalXp: 20,
      newEventXp: 20,
    });

    const result: any = await redeemBadge(1, token, {
      lat: 0,
      lon: 0,
    });

    expect(result.flagged).toBe(false);
  });

  it("evento sin latitude/longitude cargadas: se ignora la geolocalizacion", async () => {
    const badge = makeBadge({ type: "TALK" });
    const token = await signQrToken({ badgeId: badge.id, eventId: badge.eventId });
    mockGetBadgeById.mockResolvedValueOnce(badge);
    mockGetEventById.mockResolvedValueOnce({
      ...onsiteEvent,
      latitude: null,
      longitude: null,
    });
    mockRedemptionRepo.findRegistration.mockResolvedValueOnce({ userId: 1 });
    mockRedemptionRepo.redeemAtomic.mockResolvedValueOnce({
      alreadyRedeemed: false,
      redemption: { id: 1 },
      newTotalXp: 20,
      newEventXp: 20,
    });

    const result: any = await redeemBadge(1, token, { lat: 0, lon: 0 });

    expect(result.flagged).toBe(false);
  });

  it("navegador no mando geoCoords: se ignora, flagged:false por defecto", async () => {
    const badge = makeBadge({ type: "TALK" });
    const token = await signQrToken({ badgeId: badge.id, eventId: badge.eventId });
    mockGetBadgeById.mockResolvedValueOnce(badge);
    mockGetEventById.mockResolvedValueOnce(onsiteEvent);
    mockRedemptionRepo.findRegistration.mockResolvedValueOnce({ userId: 1 });
    mockRedemptionRepo.redeemAtomic.mockResolvedValueOnce({
      alreadyRedeemed: false,
      redemption: { id: 1 },
      newTotalXp: 20,
      newEventXp: 20,
    });

    const result: any = await redeemBadge(1, token);

    expect(result.flagged).toBe(false);
  });
});

const participantSession = {
  userId: 1,
  role: "PARTICIPANT" as const,
  companyId: null,
  expiresAt: new Date(),
};

const superAdminSession = {
  userId: 9,
  role: "SUPER_ADMIN" as const,
  companyId: null,
  expiresAt: new Date(),
};

const companyAdminSession = {
  userId: 8,
  role: "COMPANY_ADMIN" as const,
  companyId: 5,
  expiresAt: new Date(),
};

describe("redemptions: getMyRedemptions / getUserRegisteredEvents (service)", () => {
  it("getMyRedemptions pasa el userId como filtro al repository", async () => {
    mockRedemptionRepo.findMany.mockResolvedValueOnce([{ id: 1 }]);

    const result = await getMyRedemptions(1);

    expect(mockRedemptionRepo.findMany).toHaveBeenCalledWith({ userId: 1 });
    expect(result).toEqual([{ id: 1 }]);
  });

  it("getUserRegisteredEvents pasa el userId al repository", async () => {
    mockRedemptionRepo.findRegistrationsByUser.mockResolvedValueOnce([{ eventId: 10 }]);

    const result = await getUserRegisteredEvents(1);

    expect(mockRedemptionRepo.findRegistrationsByUser).toHaveBeenCalledWith(1);
    expect(result).toEqual([{ eventId: 10 }]);
  });
});

describe("redemptions: getMyRedemptionsHandler / getMyRegisteredEventsHandler (actions)", () => {
  it("getMyRedemptionsHandler happy: scoped al userId de la sesion", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(participantSession);
    mockRedemptionRepo.findMany.mockResolvedValueOnce([{ id: 1 }]);

    const result = await getMyRedemptionsHandler();

    expect(mockRedemptionRepo.findMany).toHaveBeenCalledWith({ userId: 1 });
    expect(result).toEqual({ success: true, data: [{ id: 1 }] });
  });

  it("getMyRedemptionsHandler unhappy: sin sesion -> {success:false, error}", async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(
      new UnauthenticatedError("se requiere iniciar sesión"),
    );

    const result = await getMyRedemptionsHandler();

    expect(result).toEqual({
      success: false,
      error: "se requiere iniciar sesión",
    });
  });

  it("getMyRegisteredEventsHandler happy: scoped al userId de la sesion", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(participantSession);
    mockRedemptionRepo.findRegistrationsByUser.mockResolvedValueOnce([{ eventId: 10 }]);

    const result = await getMyRegisteredEventsHandler();

    expect(mockRedemptionRepo.findRegistrationsByUser).toHaveBeenCalledWith(1);
    expect(result).toEqual({ success: true, data: [{ eventId: 10 }] });
  });

  it("getMyRegisteredEventsHandler unhappy: sin sesion -> {success:false, error}", async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(
      new UnauthenticatedError("se requiere iniciar sesión"),
    );

    const result = await getMyRegisteredEventsHandler();

    expect(result).toEqual({
      success: false,
      error: "se requiere iniciar sesión",
    });
  });
});

describe("redemptions: getEventParticipants (service)", () => {
  it("combina inscripciones, conteo de canjes y total de badges del evento", async () => {
    mockRedemptionRepo.findRegistrationsByEvent.mockResolvedValueOnce([
      {
        user: { id: 1, name: "Ana", email: "ana@example.com" },
        registeredAt: new Date("2026-01-01"),
        eventXp: 30,
      },
      {
        user: { id: 2, name: "Beto", email: "beto@example.com" },
        registeredAt: new Date("2026-01-02"),
        eventXp: 10,
      },
    ]);
    mockRedemptionRepo.countRedeemedByEvent.mockResolvedValueOnce(
      new Map([[1, 2]]),
    );
    mockGetBadgesByField.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

    const result = await getEventParticipants(100);

    expect(result).toEqual([
      {
        userId: 1,
        name: "Ana",
        email: "ana@example.com",
        registeredAt: new Date("2026-01-01"),
        eventXp: 30,
        redeemedCount: 2,
        totalBadges: 2,
      },
      {
        userId: 2,
        name: "Beto",
        email: "beto@example.com",
        registeredAt: new Date("2026-01-02"),
        eventXp: 10,
        redeemedCount: 0,
        totalBadges: 2,
      },
    ]);
  });
});

describe("redemptions: adminsGetEventParticipantsHandler (action)", () => {
  it("happy: SUPER_ADMIN puede ver participantes de cualquier evento", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockGetEventById.mockResolvedValueOnce({ id: 100, companyId: 5 });
    vi.mocked(requireCompanyOwnership).mockResolvedValueOnce(superAdminSession);
    mockRedemptionRepo.findRegistrationsByEvent.mockResolvedValueOnce([]);
    mockRedemptionRepo.countRedeemedByEvent.mockResolvedValueOnce(new Map());

    const result = await adminsGetEventParticipantsHandler(100);

    expect(result).toEqual({ success: true, data: [] });
  });

  it("unhappy: COMPANY_ADMIN de otra empresa -> ForbiddenError", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(companyAdminSession);
    mockGetEventById.mockResolvedValueOnce({ id: 100, companyId: 99 });
    vi.mocked(requireCompanyOwnership).mockRejectedValueOnce(
      new ForbiddenError("usuario no autorizado"),
    );

    const result = await adminsGetEventParticipantsHandler(100);

    expect(result).toEqual({ success: false, error: "usuario no autorizado" });
  });

  it("unhappy: evento inexistente -> EventNotFoundError", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(superAdminSession);
    mockGetEventById.mockRejectedValueOnce(new EventNotFoundError());

    const result = await adminsGetEventParticipantsHandler(999);

    expect(result).toEqual({ success: false, error: "evento no encontrado" });
  });
});

describe("redemptions: getEventMetrics (service)", () => {
  it("calcula participantes, completitud promedio, flagged y ranking de badges", async () => {
    mockRedemptionRepo.findRegistrationsByEvent.mockResolvedValueOnce([
      {
        user: { id: 1, name: "Ana", email: "ana@example.com" },
        registeredAt: new Date(),
        eventXp: 30,
      },
    ]);
    mockRedemptionRepo.countRedeemedByEvent.mockResolvedValueOnce(
      new Map([[1, 1]]),
    );
    mockGetBadgesByField.mockResolvedValue([
      { id: 1, name: "Bienvenida", type: "WELCOME", rarity: "COMMON" },
      { id: 2, name: "Charla X", type: "TALK", rarity: "RARE" },
    ]);
    mockRedemptionRepo.findMany.mockResolvedValueOnce([
      { badgeId: 1, flagged: false },
      { badgeId: 1, flagged: true },
    ]);

    const result = await getEventMetrics(100);

    expect(result.participantsCount).toBe(1);
    expect(result.avgCompletionPct).toBe(50);
    expect(result.flaggedRedemptionsCount).toBe(1);
    expect(result.badgesRedeemedByType).toEqual([
      { id: 1, name: "Bienvenida", type: "WELCOME", rarity: "COMMON", count: 2 },
      { id: 2, name: "Charla X", type: "TALK", rarity: "RARE", count: 0 },
    ]);
  });

  it("evento sin badges ni participantes -> avgCompletionPct:0, sin division por cero", async () => {
    mockRedemptionRepo.findRegistrationsByEvent.mockResolvedValueOnce([]);
    mockRedemptionRepo.countRedeemedByEvent.mockResolvedValueOnce(new Map());
    mockGetBadgesByField.mockResolvedValue([]);
    mockRedemptionRepo.findMany.mockResolvedValueOnce([]);

    const result = await getEventMetrics(100);

    expect(result.avgCompletionPct).toBe(0);
    expect(result.participantsCount).toBe(0);
  });
});

describe("redemptions: adminsGetEventMetricsHandler (action)", () => {
  it("happy: COMPANY_ADMIN ve las metricas de su propio evento", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(companyAdminSession);
    mockGetEventById.mockResolvedValueOnce({ id: 100, companyId: 5 });
    vi.mocked(requireCompanyOwnership).mockResolvedValueOnce(companyAdminSession);
    mockRedemptionRepo.findRegistrationsByEvent.mockResolvedValueOnce([]);
    mockRedemptionRepo.countRedeemedByEvent.mockResolvedValueOnce(new Map());
    mockGetBadgesByField.mockResolvedValue([]);
    mockRedemptionRepo.findMany.mockResolvedValueOnce([]);

    const result = await adminsGetEventMetricsHandler(100);

    expect(result.success).toBe(true);
  });

  it("unhappy: sin sesion -> {success:false, error}", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new UnauthenticatedError("se requiere iniciar sesión"),
    );

    const result = await adminsGetEventMetricsHandler(100);

    expect(result).toEqual({
      success: false,
      error: "se requiere iniciar sesión",
    });
  });
});
