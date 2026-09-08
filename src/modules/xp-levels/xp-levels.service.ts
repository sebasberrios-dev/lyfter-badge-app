import { Level, LevelInfo } from "./xp-levels.types";

export const LEVEL_THRESHOLDS: Level[] = [
  { level: 1, name: "Nivel 1", minXp: 0 },
  { level: 2, name: "Nivel 2", minXp: 100 },
  { level: 3, name: "Nivel 3", minXp: 300 },
  { level: 4, name: "Nivel 4", minXp: 600 },
  { level: 5, name: "Nivel 5", minXp: 1000 },
  { level: 6, name: "Nivel 6", minXp: 1500 },
];

export function getLevelForXp(totalXp: number): LevelInfo {
  let current = LEVEL_THRESHOLDS[0];
  let next: Level | null = null;

  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i].minXp) {
      current = LEVEL_THRESHOLDS[i];
      next = LEVEL_THRESHOLDS[i + 1] ?? null;
    } else {
      break;
    }
  }

  return {
    level: current.level,
    name: current.name,
    minXp: current.minXp,
    nextLevelMinXp: next?.minXp ?? null,
    xpToNextLevel: next ? next.minXp - totalXp : null,
  };
}

export function didLevelUp(xpBefore: number, xpAfter: number): boolean {
  return getLevelForXp(xpBefore).level !== getLevelForXp(xpAfter).level;
}
