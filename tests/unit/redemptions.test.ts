import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedemptionRepo = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
  findRegistration: vi.fn(),
  redeemAtomic: vi.fn(),
}));

const mockGetBadgeById = vi.hoisted(() => vi.fn());
const mockGetEventById = vi.hoisted(() => vi.fn());

vi.mock("@/modules/redemptions/redemptions.repository", () => ({
  RedemptionRepository: vi.fn(function () {
    return mockRedemptionRepo;
  }),
}));

vi.mock("@/modules/badges/badges.service", () => ({
  getBadgeById: mockGetBadgeById,
}));

vi.mock("@/modules/events/events.service", () => ({
  getEventById: mockGetEventById,
}));

// lib/qr-token.ts (firma/verifica JWT) y lib/geolocation.ts (Haversine) NO se
// mockean -- son criptografia/matematica pura sin DB, dejarlos reales le da
// valor genuino a estos tests (tokens firmados/verificados de verdad).
import { signQrToken } from "@/lib/qr-token";
import { redeemBadge } from "@/modules/redemptions/redemptions.service";
import {
  InvalidTokenError,
  ExpiredTokenError,
  BadgeDoesNotMatchEventError,
  EventNotStartedError,
  EventAlreadyEndedError,
  UserNotRegisteredToEventError,
} from "@/modules/redemptions/redemptions.errors";

beforeEach(() => {
  vi.resetAllMocks();
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
