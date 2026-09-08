import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLeaderboardRepo = vi.hoisted(() => ({
  findTopUsersByTotalXp: vi.fn(),
  findTopRegistrationsByEventXp: vi.fn(),
  findRedemptionBadgeTypesForUsersInEvent: vi.fn(),
  countUsersWithHigherXp: vi.fn(),
}));

const mockGetEventById = vi.hoisted(() => vi.fn());
const mockGetUserProfile = vi.hoisted(() => vi.fn());

vi.mock("@/modules/leaderboard/leaderboard.repository", () => ({
  LeaderboardRepository: vi.fn(function () {
    return mockLeaderboardRepo;
  }),
}));

vi.mock("@/modules/events/events.service", () => ({
  getEventById: mockGetEventById,
}));

vi.mock("@/modules/users/users.service", () => ({
  getUserProfile: mockGetUserProfile,
}));

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>();
  return {
    ...actual,
    requireAuth: vi.fn(),
  };
});

import {
  getGlobalLeaderboard,
  getEventLeaderboard,
  getUserGlobalRank,
} from "@/modules/leaderboard/leaderboard.service";
import {
  getGlobalLeaderboardHandler,
  getEventLeaderboardHandler,
  getMyGlobalRankHandler,
} from "@/modules/leaderboard/leaderboard.actions";
import { EventNotFoundError } from "@/modules/events/events.errors";
import { UserNotFoundError } from "@/modules/users/users.errors";
import { requireAuth, UnauthenticatedError } from "@/lib/auth-guard";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("leaderboard: getGlobalLeaderboard", () => {
  it("asigna rank correlativo en el orden que devuelve el repository, con el nivel correcto", async () => {
    mockLeaderboardRepo.findTopUsersByTotalXp.mockResolvedValueOnce([
      { id: 8, name: "User B", totalXp: 900 },
      { id: 7, name: "User A", totalXp: 500 },
      { id: 9, name: "User C", totalXp: 200 },
    ]);

    const result = await getGlobalLeaderboard(50);

    expect(result).toEqual([
      { rank: 1, userId: 8, name: "User B", totalXp: 900, level: expect.objectContaining({ level: 4 }) },
      { rank: 2, userId: 7, name: "User A", totalXp: 500, level: expect.objectContaining({ level: 3 }) },
      { rank: 3, userId: 9, name: "User C", totalXp: 200, level: expect.objectContaining({ level: 2 }) },
    ]);
  });

  it("pasa el limit al repository", async () => {
    mockLeaderboardRepo.findTopUsersByTotalXp.mockResolvedValueOnce([]);

    await getGlobalLeaderboard(10);

    expect(mockLeaderboardRepo.findTopUsersByTotalXp).toHaveBeenCalledWith(10);
  });

  it("usa DEFAULT_LEADERBOARD_LIMIT si no se pasa limit", async () => {
    mockLeaderboardRepo.findTopUsersByTotalXp.mockResolvedValueOnce([]);

    await getGlobalLeaderboard();

    expect(mockLeaderboardRepo.findTopUsersByTotalXp).toHaveBeenCalledWith(50);
  });
});

describe("leaderboard: getEventLeaderboard", () => {
  it("cuenta talksAttended/boothsVisited por usuario a partir de los canjes", async () => {
    mockGetEventById.mockResolvedValueOnce({ id: 10, companyId: 1 });
    mockLeaderboardRepo.findTopRegistrationsByEventXp.mockResolvedValueOnce([
      { userId: 9, eventXp: 50, user: { name: "User C" } },
      { userId: 7, eventXp: 30, user: { name: "User A" } },
      { userId: 8, eventXp: 10, user: { name: "User B" } },
    ]);
    mockLeaderboardRepo.findRedemptionBadgeTypesForUsersInEvent.mockResolvedValueOnce([
      { userId: 9, badgeType: "TALK" },
      { userId: 9, badgeType: "BOOTH" },
      { userId: 7, badgeType: "TALK" },
      { userId: 8, badgeType: "BOOTH" },
    ]);

    const result = await getEventLeaderboard(10);

    expect(result).toEqual([
      { rank: 1, userId: 9, name: "User C", eventXp: 50, talksAttended: 1, boothsVisited: 1 },
      { rank: 2, userId: 7, name: "User A", eventXp: 30, talksAttended: 1, boothsVisited: 0 },
      { rank: 3, userId: 8, name: "User B", eventXp: 10, talksAttended: 0, boothsVisited: 1 },
    ]);
  });

  it("un usuario sin canjes en el evento queda con los conteos en 0", async () => {
    mockGetEventById.mockResolvedValueOnce({ id: 10, companyId: 1 });
    mockLeaderboardRepo.findTopRegistrationsByEventXp.mockResolvedValueOnce([
      { userId: 7, eventXp: 0, user: { name: "User A" } },
    ]);
    mockLeaderboardRepo.findRedemptionBadgeTypesForUsersInEvent.mockResolvedValueOnce([]);

    const result = await getEventLeaderboard(10);

    expect(result[0].talksAttended).toBe(0);
    expect(result[0].boothsVisited).toBe(0);
  });

  it("evento inexistente propaga EventNotFoundError sin llegar a consultar registrations", async () => {
    mockGetEventById.mockRejectedValueOnce(new EventNotFoundError());

    await expect(getEventLeaderboard(999999)).rejects.toThrow(EventNotFoundError);
    expect(mockLeaderboardRepo.findTopRegistrationsByEventXp).not.toHaveBeenCalled();
  });
});

describe("leaderboard: actions (Server Actions publicos, sin auth)", () => {
  it("getGlobalLeaderboardHandler envuelve el resultado en {success: true, data}", async () => {
    mockLeaderboardRepo.findTopUsersByTotalXp.mockResolvedValueOnce([]);

    const result = await getGlobalLeaderboardHandler();

    expect(result).toEqual({ success: true, data: [] });
  });

  it("getEventLeaderboardHandler envuelve EventNotFoundError en {success: false, error}", async () => {
    mockGetEventById.mockRejectedValueOnce(new EventNotFoundError());

    const result = await getEventLeaderboardHandler(999999);

    expect(result).toEqual({ success: false, error: "evento no encontrado" });
  });
});

describe("leaderboard: getUserGlobalRank (service)", () => {
  it("rank 1 cuando nadie tiene mas XP", async () => {
    mockGetUserProfile.mockResolvedValueOnce({ id: 1, totalXp: 500 });
    mockLeaderboardRepo.countUsersWithHigherXp.mockResolvedValueOnce(0);

    const result = await getUserGlobalRank(1);

    expect(mockLeaderboardRepo.countUsersWithHigherXp).toHaveBeenCalledWith(500);
    expect(result).toEqual({
      rank: 1,
      totalXp: 500,
      level: expect.objectContaining({ level: 3 }),
    });
  });

  it("rank = cantidad de usuarios con mas XP + 1", async () => {
    mockGetUserProfile.mockResolvedValueOnce({ id: 1, totalXp: 100 });
    mockLeaderboardRepo.countUsersWithHigherXp.mockResolvedValueOnce(4);

    const result = await getUserGlobalRank(1);

    expect(result.rank).toBe(5);
  });

  it("usuario inexistente propaga UserNotFoundError", async () => {
    mockGetUserProfile.mockRejectedValueOnce(new UserNotFoundError());

    await expect(getUserGlobalRank(999999)).rejects.toThrow(UserNotFoundError);
    expect(mockLeaderboardRepo.countUsersWithHigherXp).not.toHaveBeenCalled();
  });
});

describe("leaderboard: getMyGlobalRankHandler (action)", () => {
  const participantSession = {
    userId: 1,
    role: "PARTICIPANT" as const,
    companyId: null,
    expiresAt: new Date(),
  };

  it("happy: usa el userId de la sesion, no uno pasado por el cliente", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(participantSession);
    mockGetUserProfile.mockResolvedValueOnce({ id: 1, totalXp: 100 });
    mockLeaderboardRepo.countUsersWithHigherXp.mockResolvedValueOnce(0);

    const result = await getMyGlobalRankHandler();

    expect(mockGetUserProfile).toHaveBeenCalledWith(1);
    expect(result).toEqual({
      success: true,
      data: { rank: 1, totalXp: 100, level: expect.objectContaining({ level: 2 }) },
    });
  });

  it("unhappy: sin sesion -> {success:false, error}", async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(
      new UnauthenticatedError("se requiere iniciar sesión"),
    );

    const result = await getMyGlobalRankHandler();

    expect(result).toEqual({
      success: false,
      error: "se requiere iniciar sesión",
    });
  });
});
