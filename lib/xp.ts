import { getStreakMultiplier } from "@/lib/streak";

export const MOOD_BASE_XP = 10;

export type XpSourceType = "mood" | "minigame" | "bonus";

export function calculateMoodXP(streakDay: number): {
  baseXP: number;
  multiplier: number;
  finalXP: number;
} {
  const multiplier = getStreakMultiplier(streakDay);
  return {
    baseXP: MOOD_BASE_XP,
    multiplier,
    finalXP: Math.round(MOOD_BASE_XP * multiplier),
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
