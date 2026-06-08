import { NextResponse } from "next/server";
import { getTodayDateString } from "@/lib/date";
import { getHeartBalance } from "@/lib/engagement";
import { getUserProgress } from "@/lib/progress";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";

const fallbackHeroMessage = {
  title: "Jaga mood, kumpulin Hearts, dan rawat garden pelan-pelan.",
  body: "Hari ini cukup isi mood dulu. Quest dan reward bisa menyusul setelahnya.",
  tone: "soft",
};

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = createServiceRoleClient();
    const today = getTodayDateString();

    const [
      todayMood,
      history,
      progress,
      games,
      heartsBalance,
      rewards,
      redemptions,
      questAssignments,
      inventory,
      garden,
      calendarEvents,
      calendarMoods,
      heroMessage,
    ] = await Promise.all([
      db
        .from("moods")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle(),
      db
        .from("moods")
        .select("date, rating, streak_day, xp_earned")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(7),
      getUserProgress(db, user.id),
      db
        .from("mini_games")
        .select("*")
        .eq("is_active", true)
        .or(`active_date.is.null,active_date.eq.${today}`)
        .order("active_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3),
      getHeartBalance(db, user.id),
      db
        .from("rewards")
        .select("*")
        .eq("is_active", true)
        .order("cost_hearts", { ascending: true }),
      db
        .from("reward_redemptions")
        .select("*, rewards(title, category)")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false })
        .limit(20),
      db
        .from("daily_quest_assignments")
        .select("*, daily_quest_bank(*)")
        .eq("is_active", true)
        .eq("active_date", today)
        .order("created_at", { ascending: true }),
      db
        .from("user_inventory")
        .select("*")
        .eq("user_id", user.id)
        .order("item_type", { ascending: true }),
      db
        .from("garden_items")
        .select("*")
        .eq("user_id", user.id)
        .order("earned_date", { ascending: false })
        .limit(30),
      db
        .from("couple_events")
        .select("*")
        .eq("is_active", true)
        .in("visibility", ["user", "both"])
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(40),
      db
        .from("moods")
        .select("id, date, rating")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(30),
      db
        .from("hero_messages")
        .select("*")
        .eq("is_active", true)
        .or(`active_date.is.null,active_date.lte.${today}`)
        .order("active_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const minigameIds = games.data?.map((game: { id: string }) => game.id) ?? [];
    const questAssignmentIds =
      questAssignments.data?.map((assignment: { id: string }) => assignment.id) ?? [];

    const [minigameCompletions, questCompletions] = await Promise.all([
      minigameIds.length
        ? db
            .from("mini_game_completions")
            .select("*")
            .eq("user_id", user.id)
            .in("minigame_id", minigameIds)
        : Promise.resolve({ data: [] }),
      questAssignmentIds.length
        ? db
            .from("daily_quest_completions")
            .select("*")
            .eq("user_id", user.id)
            .in("assignment_id", questAssignmentIds)
        : Promise.resolve({ data: [] }),
    ]);

    return NextResponse.json({
      dashboard: {
        todayMood: todayMood.data ?? null,
        history: history.data ?? [],
        totalXP: progress.totalXP,
        currentStreak: progress.currentStreak,
        streakMultiplier: progress.streakMultiplier,
        level: progress.level,
      },
      minigames: games.data ?? [],
      completions: minigameCompletions.data ?? [],
      engagement: {
        heartsBalance,
        rewards: rewards.data ?? [],
        redemptions: redemptions.data ?? [],
        questAssignments: questAssignments.data ?? [],
        questCompletions: questCompletions.data ?? [],
        inventory: inventory.data ?? [],
        gardenItems: garden.data ?? [],
        calendar: {
          events: calendarEvents.data ?? [],
          moods: calendarMoods.data ?? [],
          quests: [],
          rewards: [],
        },
      },
      heroMessage: heroMessage.data ?? fallbackHeroMessage,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal memuat dashboard.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
