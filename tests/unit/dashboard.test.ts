import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDashboardRepo = vi.hoisted(() => ({
  findLatestSnapshotBefore: vi.fn(),
  upsertSnapshot: vi.fn(),
  countDistinctAttendees: vi.fn(),
  countTotalRedemptions: vi.fn(),
  countActiveEvents: vi.fn(),
  countActiveEventBadgesByType: vi.fn(),
  findTopRedeemedBadges: vi.fn(),
  findRedemptionTimestamps: vi.fn(),
  findRecentRedemptions: vi.fn(),
}));

vi.mock("@/modules/dashboard/dashboard.repository", () => ({
  DashboardRepository: vi.fn(function () {
    return mockDashboardRepo;
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
  computeAttendeesTrend,
  computeRedemptionsTrend,
  getDashboardMetrics,
  recordSnapshotSafe,
  startOfUtcDay,
} from "@/modules/dashboard/dashboard.service";
import { getDashboardMetricsHandler } from "@/modules/dashboard/dashboard.actions";
import {
  requireRole,
  ForbiddenError,
  UnauthenticatedError,
} from "@/lib/auth-guard";

beforeEach(() => {
  vi.resetAllMocks();
  mockDashboardRepo.findLatestSnapshotBefore.mockResolvedValue(null);
  mockDashboardRepo.upsertSnapshot.mockResolvedValue(undefined);
  mockDashboardRepo.countDistinctAttendees.mockResolvedValue(0);
  mockDashboardRepo.countTotalRedemptions.mockResolvedValue(0);
  mockDashboardRepo.countActiveEvents.mockResolvedValue(0);
  mockDashboardRepo.countActiveEventBadgesByType.mockResolvedValue({ talks: 0, booths: 0 });
  mockDashboardRepo.findTopRedeemedBadges.mockResolvedValue([]);
  mockDashboardRepo.findRedemptionTimestamps.mockResolvedValue([]);
  mockDashboardRepo.findRecentRedemptions.mockResolvedValue([]);
});

describe("dashboard: startOfUtcDay", () => {
  it("trunca una fecha con hora/minutos a medianoche UTC", () => {
    const withTime = new Date(Date.UTC(2026, 2, 15, 14, 37, 22));
    expect(startOfUtcDay(withTime)).toEqual(new Date(Date.UTC(2026, 2, 15, 0, 0, 0)));
  });
});

describe("dashboard: computeAttendeesTrend", () => {
  const today = new Date(Date.UTC(2026, 2, 15));

  it("sin snapshot previo devuelve available:false", async () => {
    mockDashboardRepo.findLatestSnapshotBefore.mockResolvedValueOnce(null);

    const result = await computeAttendeesTrend(1, today, 100);

    expect(result).toEqual({ available: false });
  });

  it("snapshot previo con attendeesCount:0 devuelve available:false (sin division por cero)", async () => {
    mockDashboardRepo.findLatestSnapshotBefore.mockResolvedValueOnce({
      date: new Date(Date.UTC(2026, 2, 14)),
      attendeesCount: 0,
    });

    const result = await computeAttendeesTrend(1, today, 50);

    expect(result).toEqual({ available: false });
  });

  it("snapshot de ayer: label 'vs. ayer' y percentChange positivo", async () => {
    mockDashboardRepo.findLatestSnapshotBefore.mockResolvedValueOnce({
      date: new Date(Date.UTC(2026, 2, 14)),
      attendeesCount: 100,
    });

    const result = await computeAttendeesTrend(1, today, 120);

    expect(result).toEqual({
      available: true,
      percentChange: 20,
      daysSinceSnapshot: 1,
      label: "vs. ayer",
    });
  });

  it("snapshot de ayer: percentChange negativo cuando los asistentes bajaron", async () => {
    mockDashboardRepo.findLatestSnapshotBefore.mockResolvedValueOnce({
      date: new Date(Date.UTC(2026, 2, 14)),
      attendeesCount: 100,
    });

    const result = await computeAttendeesTrend(1, today, 80);

    expect(result).toEqual({
      available: true,
      percentChange: -20,
      daysSinceSnapshot: 1,
      label: "vs. ayer",
    });
  });

  it("snapshot de hace varios dias: label 'vs. hace N dias'", async () => {
    mockDashboardRepo.findLatestSnapshotBefore.mockResolvedValueOnce({
      date: new Date(Date.UTC(2026, 2, 10)),
      attendeesCount: 100,
    });

    const result = await computeAttendeesTrend(1, today, 150);

    expect(result).toEqual({
      available: true,
      percentChange: 50,
      daysSinceSnapshot: 5,
      label: "vs. hace 5 días",
    });
  });
});

describe("dashboard: recordSnapshotSafe", () => {
  const today = new Date(Date.UTC(2026, 2, 15));

  it("llama a upsertSnapshot con companyId/fecha/ambos conteos correctos", async () => {
    mockDashboardRepo.upsertSnapshot.mockResolvedValueOnce(undefined);

    await recordSnapshotSafe(3, today, 42, 84);

    expect(mockDashboardRepo.upsertSnapshot).toHaveBeenCalledWith(3, today, 42, 84);
  });

  it("no lanza cuando upsertSnapshot falla, solo loggea", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockDashboardRepo.upsertSnapshot.mockRejectedValueOnce(new Error("fallo simulado"));

    await expect(recordSnapshotSafe(3, today, 42, 84)).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

describe("dashboard: computeRedemptionsTrend", () => {
  const today = new Date(Date.UTC(2026, 2, 15));

  it("sin snapshot previo devuelve null", async () => {
    mockDashboardRepo.findLatestSnapshotBefore.mockResolvedValueOnce(null);

    const result = await computeRedemptionsTrend(1, today, 2.5);

    expect(result).toBeNull();
  });

  it("snapshot previo con attendeesCount:0 devuelve null (sin division por cero)", async () => {
    mockDashboardRepo.findLatestSnapshotBefore.mockResolvedValueOnce({
      date: new Date(Date.UTC(2026, 2, 14)),
      attendeesCount: 0,
      totalRedemptionsCount: 5,
    });

    const result = await computeRedemptionsTrend(1, today, 2.5);

    expect(result).toBeNull();
  });

  it("ratio subio respecto a ayer devuelve 'up'", async () => {
    mockDashboardRepo.findLatestSnapshotBefore.mockResolvedValueOnce({
      date: new Date(Date.UTC(2026, 2, 14)),
      attendeesCount: 4,
      totalRedemptionsCount: 8, // ratio ayer: 2.0
    });

    const result = await computeRedemptionsTrend(1, today, 2.5);

    expect(result).toBe("up");
  });

  it("ratio bajo respecto a ayer devuelve 'down'", async () => {
    mockDashboardRepo.findLatestSnapshotBefore.mockResolvedValueOnce({
      date: new Date(Date.UTC(2026, 2, 14)),
      attendeesCount: 4,
      totalRedemptionsCount: 16, // ratio ayer: 4.0
    });

    const result = await computeRedemptionsTrend(1, today, 2.5);

    expect(result).toBe("down");
  });

  it("ratio igual a ayer devuelve null (sin flecha)", async () => {
    mockDashboardRepo.findLatestSnapshotBefore.mockResolvedValueOnce({
      date: new Date(Date.UTC(2026, 2, 14)),
      attendeesCount: 4,
      totalRedemptionsCount: 10, // ratio ayer: 2.5
    });

    const result = await computeRedemptionsTrend(1, today, 2.5);

    expect(result).toBeNull();
  });
});

describe("dashboard: getDashboardMetrics", () => {
  it("orquesta las queries y arma el DashboardMetrics completo", async () => {
    mockDashboardRepo.countDistinctAttendees.mockResolvedValueOnce(4);
    mockDashboardRepo.countTotalRedemptions.mockResolvedValueOnce(10);
    mockDashboardRepo.countActiveEvents.mockResolvedValueOnce(2);
    mockDashboardRepo.countActiveEventBadgesByType.mockResolvedValueOnce({
      talks: 3,
      booths: 5,
    });
    mockDashboardRepo.findTopRedeemedBadges.mockResolvedValueOnce([
      { id: 1, name: "Keynote", type: "TALK", rarity: "RARE", count: 5 },
    ]);
    mockDashboardRepo.findRedemptionTimestamps.mockResolvedValueOnce([]);
    mockDashboardRepo.findRecentRedemptions.mockResolvedValueOnce([
      { userId: 1, badgeId: 1, userName: "Ana", badgeName: "Keynote", redeemAt: new Date() },
    ]);

    const result = await getDashboardMetrics(null);

    expect(result.attendeesCount).toBe(4);
    expect(result.totalRedemptionsCount).toBe(10);
    expect(result.activeEventsCount).toBe(2);
    expect(result.activeEventBadgeCounts).toEqual({ talks: 3, booths: 5 });
    expect(result.topRedeemedBadges).toHaveLength(1);
    expect(result.recentRedemptions).toHaveLength(1);
    expect(result.attendeesTrend).toEqual({ available: false });
  });

  it("redemptionsPerAttendee calcula el decimal correcto", async () => {
    mockDashboardRepo.countDistinctAttendees.mockResolvedValueOnce(4);
    mockDashboardRepo.countTotalRedemptions.mockResolvedValueOnce(10);

    const result = await getDashboardMetrics(null);

    expect(result.redemptionsPerAttendee).toBe(2.5);
  });

  it("redemptionsPerAttendee es 0 sin division por cero cuando no hay asistentes", async () => {
    mockDashboardRepo.countDistinctAttendees.mockResolvedValueOnce(0);
    mockDashboardRepo.countTotalRedemptions.mockResolvedValueOnce(10);

    const result = await getDashboardMetrics(null);

    expect(result.redemptionsPerAttendee).toBe(0);
  });

  it("redemptionsByHour agrupa timestamps en los 24 buckets correctos", async () => {
    // Construidos con el constructor de hora local (no Date.UTC) porque
    // buildHourlyBuckets agrupa por getHours() (hora local) -- así el test
    // no depende de la zona horaria de la maquina que lo corre.
    mockDashboardRepo.findRedemptionTimestamps.mockResolvedValueOnce([
      new Date(2026, 2, 15, 9, 0, 0),
      new Date(2026, 2, 15, 9, 30, 0),
      new Date(2026, 2, 15, 14, 0, 0),
    ]);

    const result = await getDashboardMetrics(null);

    expect(result.redemptionsByHour).toHaveLength(24);
    expect(result.redemptionsByHour.map((b) => b.hour)).toEqual(
      Array.from({ length: 24 }, (_, i) => i),
    );
    expect(result.redemptionsByHour.find((b) => b.hour === 9)?.count).toBe(2);
    expect(result.redemptionsByHour.find((b) => b.hour === 14)?.count).toBe(1);
  });

  it("arrays vacios y buckets en cero cuando no hay canjes registrados", async () => {
    const result = await getDashboardMetrics(null);

    expect(result.topRedeemedBadges).toEqual([]);
    expect(result.recentRedemptions).toEqual([]);
    expect(result.redemptionsByHour.every((b) => b.count === 0)).toBe(true);
  });

  it("registra el snapshot de hoy con ambos conteos recien calculados", async () => {
    mockDashboardRepo.countDistinctAttendees.mockResolvedValueOnce(7);
    mockDashboardRepo.countTotalRedemptions.mockResolvedValueOnce(14);

    await getDashboardMetrics(5);

    expect(mockDashboardRepo.upsertSnapshot).toHaveBeenCalledWith(
      5,
      expect.any(Date),
      7,
      14,
    );
  });
});

describe("dashboard: getDashboardMetricsHandler (scoping multi-tenant)", () => {
  it("SUPER_ADMIN sin filtro ve todo (companyId:null)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      userId: 1,
      role: "SUPER_ADMIN",
      companyId: null,
      expiresAt: new Date(),
    });

    await getDashboardMetricsHandler();

    expect(mockDashboardRepo.countDistinctAttendees).toHaveBeenCalledWith(null);
  });

  it("SUPER_ADMIN con filters.companyId respeta ese filtro", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      userId: 1,
      role: "SUPER_ADMIN",
      companyId: null,
      expiresAt: new Date(),
    });

    await getDashboardMetricsHandler({ companyId: 7 });

    expect(mockDashboardRepo.countDistinctAttendees).toHaveBeenCalledWith(7);
  });

  it("COMPANY_ADMIN queda forzado a su propia companyId aunque mande otra en el filtro", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      userId: 2,
      role: "COMPANY_ADMIN",
      companyId: 5,
      expiresAt: new Date(),
    });

    await getDashboardMetricsHandler({ companyId: 99 });

    expect(mockDashboardRepo.countDistinctAttendees).toHaveBeenCalledWith(5);
  });

  it("sin sesion devuelve {success:false} sin llamar al repository", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new UnauthenticatedError("se requiere iniciar sesión"),
    );

    const result = await getDashboardMetricsHandler();

    expect(result).toEqual({ success: false, error: "se requiere iniciar sesión" });
    expect(mockDashboardRepo.countDistinctAttendees).not.toHaveBeenCalled();
  });

  it("rol no autorizado devuelve {success:false}", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new ForbiddenError("usuario no autorizado"),
    );

    const result = await getDashboardMetricsHandler();

    expect(result).toEqual({ success: false, error: "usuario no autorizado" });
  });
});
