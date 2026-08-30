export type Level = {
  level: number;
  name: string;
  minXp: number;
};

export type LevelInfo = {
  level: number;
  name: string;
  minXp: number;
  nextLevelMinXp: number | null;
  xpToNextLevel: number | null;
};
