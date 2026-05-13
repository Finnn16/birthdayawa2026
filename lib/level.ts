export type LevelDefinition = {
  levelNumber: number;
  levelName: string;
  requiredTotalXP: number;
};

export type LevelProgress = {
  totalXP: number;
  currentLevel: LevelDefinition;
  nextLevel: LevelDefinition | null;
  progressXP: number;
  requiredForNext: number;
  progressPercent: number;
};

export const DEFAULT_LEVELS: LevelDefinition[] = [
  { levelNumber: 1, levelName: "First Spark", requiredTotalXP: 0 },
  { levelNumber: 2, levelName: "Sweet Smile", requiredTotalXP: 80 },
  { levelNumber: 3, levelName: "Tiny Crush", requiredTotalXP: 190 },
  { levelNumber: 4, levelName: "Warm Hug", requiredTotalXP: 340 },
  { levelNumber: 5, levelName: "Heart Bloom", requiredTotalXP: 540 },
  { levelNumber: 6, levelName: "Love Letter", requiredTotalXP: 800 },
  { levelNumber: 7, levelName: "Cozy Promise", requiredTotalXP: 1130 },
  { levelNumber: 8, levelName: "Deep Bond", requiredTotalXP: 1540 },
  { levelNumber: 9, levelName: "Forever Flame", requiredTotalXP: 2040 },
  { levelNumber: 10, levelName: "Endless Love", requiredTotalXP: 2640 },
];

export function getLevelProgress(
  totalXP: number,
  levels: LevelDefinition[] = DEFAULT_LEVELS,
): LevelProgress {
  const sortedLevels = [...levels].sort((a, b) => a.requiredTotalXP - b.requiredTotalXP);
  const normalizedXP = Math.max(0, Math.floor(totalXP || 0));
  const currentLevel =
    [...sortedLevels].reverse().find((level) => normalizedXP >= level.requiredTotalXP) ??
    sortedLevels[0];
  const nextLevel =
    sortedLevels.find((level) => level.requiredTotalXP > currentLevel.requiredTotalXP) ?? null;

  if (!nextLevel) {
    return {
      totalXP: normalizedXP,
      currentLevel,
      nextLevel: null,
      progressXP: 0,
      requiredForNext: 0,
      progressPercent: 100,
    };
  }

  const progressXP = normalizedXP - currentLevel.requiredTotalXP;
  const requiredForNext = nextLevel.requiredTotalXP - currentLevel.requiredTotalXP;

  return {
    totalXP: normalizedXP,
    currentLevel,
    nextLevel,
    progressXP,
    requiredForNext,
    progressPercent: Math.min(100, Math.round((progressXP / requiredForNext) * 100)),
  };
}
