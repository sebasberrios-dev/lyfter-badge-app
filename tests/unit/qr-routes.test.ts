import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedeemBadge = vi.hoisted(() => vi.fn());
const mockGetBadgeByQrToken = vi.hoisted(() => vi.fn());

vi.mock("@/modules/redemptions/redemptions.service", () => ({
  redeemBadge: mockRedeemBadge,
}));

vi.mock("@/modules/badges/badges.service", () => ({
  getBadgeByQrToken: mockGetBadgeByQrToken,
}));

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>();
  return {
    ...actual,
    requireAuth: vi.fn(),
  };
});

import { NextRequest } from "next/server";
import { POST } from "@/app/api/qr/redeem/route";
import { GET } from "@/app/api/qr/generate/route";
import { requireAuth, UnauthenticatedError } from "@/lib/auth-guard";
import {
  InvalidTokenError,
  ExpiredTokenError,
  BadgeDoesNotMatchEventError,
  EventNotStartedError,
  EventAlreadyEndedError,
  UserNotRegisteredToEventError,
} from "@/modules/redemptions/redemptions.errors";
import { BadgeNotFoundError } from "@/modules/badges/badges.errors";

beforeEach(() => {
  vi.resetAllMocks();
});

function postRedeem(body: unknown) {
  return new NextRequest("http://localhost/api/qr/redeem", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const authedSession = {
  userId: 1,
  role: "PARTICIPANT" as const,
  companyId: null,
  expiresAt: new Date(),
};

describe("POST /api/qr/redeem", () => {
  it("happy: 200 con alreadyRedeemed:false, badge/xp/level correctos", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(authedSession);
    mockRedeemBadge.mockResolvedValueOnce({
      alreadyRedeemed: false,
      badge: { id: 1, name: "Badge" },
      xpAwarded: 20,
      newTotalXp: 120,
      newEventXp: 20,
      flagged: false,
      level: { level: 2, name: "Nivel 2" },
      leveledUp: true,
    });

    const res = await POST(postRedeem({ token: "cualquier-token" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.alreadyRedeemed).toBe(false);
    expect(body.leveledUp).toBe(true);
    expect(mockRedeemBadge).toHaveBeenCalledWith(1, "cualquier-token", undefined);
  });

  it("happy: 200 con alreadyRedeemed:true en un reintento", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(authedSession);
    mockRedeemBadge.mockResolvedValueOnce({
      alreadyRedeemed: true,
      badge: { id: 1, name: "Badge" },
    });

    const res = await POST(postRedeem({ token: "cualquier-token" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.alreadyRedeemed).toBe(true);
  });

  it("unhappy: sin sesion -> 401 {error, code:UNAUTHENTICATED}", async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(
      new UnauthenticatedError("se requiere iniciar sesión"),
    );

    const res = await POST(postRedeem({ token: "x" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({
      error: "se requiere iniciar sesión",
      code: "UNAUTHENTICATED",
    });
    expect(mockRedeemBadge).not.toHaveBeenCalled();
  });

  it("unhappy: body invalido (token faltante) -> 400, sin code (error de Zod)", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(authedSession);

    const res = await POST(postRedeem({}));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBeUndefined();
    expect(mockRedeemBadge).not.toHaveBeenCalled();
  });

  it("unhappy: token con firma invalida -> 400 {code:TOKEN_INVALID}", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(authedSession);
    mockRedeemBadge.mockRejectedValueOnce(new InvalidTokenError());

    const res = await POST(postRedeem({ token: "x" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "token inválido", code: "TOKEN_INVALID" });
  });

  it("unhappy: token expirado -> 410 {code:TOKEN_EXPIRED}", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(authedSession);
    mockRedeemBadge.mockRejectedValueOnce(new ExpiredTokenError());

    const res = await POST(postRedeem({ token: "x" }));
    const body = await res.json();

    expect(res.status).toBe(410);
    expect(body).toEqual({ error: "token expirado", code: "TOKEN_EXPIRED" });
  });

  it("unhappy: badge no corresponde al evento del token -> 400 {code:BADGE_EVENT_MISMATCH}", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(authedSession);
    mockRedeemBadge.mockRejectedValueOnce(new BadgeDoesNotMatchEventError());

    const res = await POST(postRedeem({ token: "x" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe("BADGE_EVENT_MISMATCH");
  });

  it("unhappy: evento no iniciado/DRAFT -> 409 {code:EVENT_NOT_STARTED}", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(authedSession);
    mockRedeemBadge.mockRejectedValueOnce(new EventNotStartedError());

    const res = await POST(postRedeem({ token: "x" }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.code).toBe("EVENT_NOT_STARTED");
  });

  it("unhappy: evento ya finalizado -> 409 {code:EVENT_ALREADY_ENDED}", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(authedSession);
    mockRedeemBadge.mockRejectedValueOnce(new EventAlreadyEndedError());

    const res = await POST(postRedeem({ token: "x" }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.code).toBe("EVENT_ALREADY_ENDED");
  });

  it("unhappy: usuario no inscrito -> 403 {code:NOT_REGISTERED}", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(authedSession);
    mockRedeemBadge.mockRejectedValueOnce(new UserNotRegisteredToEventError());

    const res = await POST(postRedeem({ token: "x" }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.code).toBe("NOT_REGISTERED");
  });

  it("unhappy: badge/evento no encontrado -> 404 {code:NOT_FOUND}", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(authedSession);
    mockRedeemBadge.mockRejectedValueOnce(new BadgeNotFoundError());

    const res = await POST(postRedeem({ token: "x" }));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.code).toBe("NOT_FOUND");
  });

  it("unhappy: error inesperado -> 500 {code:INTERNAL_ERROR}", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(authedSession);
    mockRedeemBadge.mockRejectedValueOnce(new Error("algo se rompio"));

    const res = await POST(postRedeem({ token: "x" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.code).toBe("INTERNAL_ERROR");
  });
});

function getGenerate(qrToken?: string) {
  const url = qrToken
    ? `http://localhost/api/qr/generate?qrToken=${encodeURIComponent(qrToken)}`
    : "http://localhost/api/qr/generate";
  return new NextRequest(url);
}

describe("GET /api/qr/generate", () => {
  it("happy: 200 sin cookie de sesion (confirma que es publico), devuelve {token, expiresAt}", async () => {
    mockGetBadgeByQrToken.mockResolvedValueOnce({ id: 1, eventId: 10 });

    const res = await GET(getGenerate("un-qrtoken-cualquiera"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(typeof body.token).toBe("string");
    expect(typeof body.expiresAt).toBe("string");
    expect(requireAuth).not.toHaveBeenCalled();
  });

  it("unhappy: sin qrToken en la query -> 400 (error de Zod)", async () => {
    const res = await GET(getGenerate());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(mockGetBadgeByQrToken).not.toHaveBeenCalled();
  });

  it("unhappy: qrToken inexistente -> 404 {code:NOT_FOUND}", async () => {
    mockGetBadgeByQrToken.mockRejectedValueOnce(new BadgeNotFoundError());

    const res = await GET(getGenerate("no-existe"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.code).toBe("NOT_FOUND");
  });

  it("unhappy: error inesperado -> 500 {code:INTERNAL_ERROR}", async () => {
    mockGetBadgeByQrToken.mockRejectedValueOnce(new Error("algo se rompio"));

    const res = await GET(getGenerate("un-qrtoken"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.code).toBe("INTERNAL_ERROR");
  });
});
