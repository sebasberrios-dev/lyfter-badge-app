import { describe, it, expect } from "vitest";
import { getLevelForXp, didLevelUp } from "@/modules/xp-levels/xp-levels.service";

describe("xp-levels: getLevelForXp", () => {
  it("0 xp -> Nivel 1", () => {
    const result = getLevelForXp(0);
    expect(result.level).toBe(1);
    expect(result.name).toBe("Nivel 1");
    expect(result.nextLevelMinXp).toBe(100);
    expect(result.xpToNextLevel).toBe(100);
  });

  it("99 xp -> sigue en Nivel 1, justo debajo del umbral", () => {
    const result = getLevelForXp(99);
    expect(result.level).toBe(1);
    expect(result.xpToNextLevel).toBe(1);
  });

  it("100 xp -> exactamente en el umbral, ya es Nivel 2", () => {
    const result = getLevelForXp(100);
    expect(result.level).toBe(2);
    expect(result.name).toBe("Nivel 2");
  });

  it("1500 xp -> Nivel 6 (maximo), sin siguiente nivel", () => {
    const result = getLevelForXp(1500);
    expect(result.level).toBe(6);
    expect(result.nextLevelMinXp).toBeNull();
    expect(result.xpToNextLevel).toBeNull();
  });

  it("5000 xp (muy por encima del maximo) -> sigue en Nivel 6, no revienta", () => {
    const result = getLevelForXp(5000);
    expect(result.level).toBe(6);
    expect(result.nextLevelMinXp).toBeNull();
  });
});

describe("xp-levels: didLevelUp", () => {
  it("cruzar un umbral (50 -> 150) devuelve true", () => {
    expect(didLevelUp(50, 150)).toBe(true);
  });

  it("no cruzar ningun umbral (50 -> 80) devuelve false", () => {
    expect(didLevelUp(50, 80)).toBe(false);
  });

  it("quedarse en el mismo XP devuelve false", () => {
    expect(didLevelUp(100, 100)).toBe(false);
  });
});
