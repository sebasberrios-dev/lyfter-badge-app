import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBadgeById } from "@/modules/badges/badges.service";
import { BadgeNotFoundError } from "@/modules/badges/badges.errors";

const mockBadgeRepo = vi.hoisted(() => ({
  findById: vi.fn(),
  findByQrToken: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/modules/badges/badges.repository", () => ({
  BadgeRepository: vi.fn(function () {
    return mockBadgeRepo;
  }),
}));

describe("smoke: server-only shim", () => {
  it("importa lib/qr-token.ts sin reventar por server-only", async () => {
    const mod = await import("@/lib/qr-token");
    expect(typeof mod.signQrToken).toBe("function");
    expect(typeof mod.verifyQrToken).toBe("function");
  });

  it("importa lib/auth-guard.ts sin reventar por server-only", async () => {
    const mod = await import("@/lib/auth-guard");
    expect(typeof mod.requireAuth).toBe("function");
    expect(typeof mod.requireRole).toBe("function");
    expect(typeof mod.requireCompanyOwnership).toBe("function");
  });

  it("importa lib/session.ts sin reventar por server-only", async () => {
    const mod = await import("@/lib/session");
    expect(typeof mod.encrypt).toBe("function");
    expect(typeof mod.decrypt).toBe("function");
  });
});

describe("smoke: mock de repository de punta a punta", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("getBadgeById devuelve el badge mockeado en el caso feliz", async () => {
    const fakeBadge = {
      id: 1,
      name: "Badge de prueba",
      eventId: 10,
      event: { companyId: 5 },
    } as any;
    mockBadgeRepo.findById.mockResolvedValueOnce(fakeBadge);

    const result = await getBadgeById(1);

    expect(result).toEqual(fakeBadge);
    expect(mockBadgeRepo.findById).toHaveBeenCalledWith(1);
  });

  it("getBadgeById lanza BadgeNotFoundError cuando el repository devuelve null", async () => {
    mockBadgeRepo.findById.mockResolvedValueOnce(null);

    await expect(getBadgeById(999)).rejects.toThrow(BadgeNotFoundError);
  });
});
