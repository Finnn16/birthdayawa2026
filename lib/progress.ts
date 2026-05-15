import { getLevelProgress } from "@/lib/level";
import { getStreakMultiplier } from "@/lib/streak";
import { getCurrentStreakWithProtection } from "@/lib/streak-protection";

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => any;
  };
};

export async function getMoodXP(supabase: SupabaseLike, userId: string): Promise<number> {
  const { data } = await supabase.from("moods").select("xp_earned").eq("user_id", userId);
  return data?.reduce((sum: number, item: { xp_earned: number }) => sum + item.xp_earned, 0) ?? 0;
}

export async function getNonMoodTransactionXP(
  supabase: SupabaseLike,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("xp_transactions")
    .select("final_xp, source_type")
    .eq("user_id", userId);

  if (error) return 0;

  return (
    data
      ?.filter((item: { source_type: string }) => item.source_type !== "mood")
      .reduce((sum: number, item: { final_xp: number }) => sum + item.final_xp, 0) ?? 0
  );
}

export async function getCurrentStreak(supabase: SupabaseLike, userId: string): Promise<number> {
  return getCurrentStreakWithProtection(supabase, userId);
}

export async function getUserProgress(supabase: SupabaseLike, userId: string) {
  const [moodXP, transactionXP, currentStreak] = await Promise.all([
    getMoodXP(supabase, userId),
    getNonMoodTransactionXP(supabase, userId),
    getCurrentStreak(supabase, userId),
  ]);

  const totalXP = moodXP + transactionXP;
  return {
    moodXP,
    transactionXP,
    totalXP,
    currentStreak,
    streakMultiplier: getStreakMultiplier(Math.max(1, currentStreak || 1)),
    level: getLevelProgress(totalXP),
  };
}
