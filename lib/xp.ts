export const MOOD_BASE_XP = 5;
export const MOOD_STREAK_7_DAY_XP = 25;
export const MOOD_STREAK_14_DAY_XP = 35;

export type XpSourceType = "mood" | "minigame" | "bonus";

export function calculateMoodXP(streakDay: number): {
  baseXP: number;
  multiplier: number;
  finalXP: number;
} {
  const normalizedStreak = Math.max(1, Math.floor(streakDay || 1));
  const finalXP =
    normalizedStreak >= 14
      ? MOOD_STREAK_14_DAY_XP
      : normalizedStreak >= 7
        ? MOOD_STREAK_7_DAY_XP
        : MOOD_BASE_XP;

  return {
    baseXP: MOOD_BASE_XP,
    multiplier: finalXP / MOOD_BASE_XP,
    finalXP,
  };
}

export function calculateMiniGameXP(
  xpReward: number,
  isCorrect = true,
): {
  baseXP: number;
  multiplier: number;
  finalXP: number;
} {
  const baseXP = Math.max(0, Math.floor(Number(xpReward) || 0));
  return {
    baseXP,
    multiplier: isCorrect ? 1 : 0,
    finalXP: isCorrect ? baseXP : 0,
  };
}

export function sumXP(items: Array<{ xp_earned?: number | null; final_xp?: number | null }>): number {
  return items.reduce((total, item) => total + (item.xp_earned ?? item.final_xp ?? 0), 0);
}
