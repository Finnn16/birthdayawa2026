export type StreakTier = {
  minDay: number;
  maxDay?: number;
  multiplier: number;
};

export const STREAK_TIERS: StreakTier[] = [
  { minDay: 1, maxDay: 6, multiplier: 1 },
  { minDay: 7, maxDay: 13, multiplier: 1.2 },
  { minDay: 14, maxDay: 20, multiplier: 1.5 },
  { minDay: 21, maxDay: 34, multiplier: 1.8 },
  { minDay: 35, multiplier: 2 },
];

export function calculateStreakDay(previousDayStreak?: number | null): number {
  return previousDayStreak ? previousDayStreak + 1 : 1;
}

export function getStreakMultiplier(streakDay: number): number {
  const normalized = Math.max(1, Math.floor(streakDay || 1));
  const tier = STREAK_TIERS.find(
    (item) =>
      normalized >= item.minDay &&
      (item.maxDay === undefined || normalized <= item.maxDay),
  );
  return tier?.multiplier ?? 1;
}
