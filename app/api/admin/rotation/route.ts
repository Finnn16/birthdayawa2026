import { NextRequest, NextResponse } from "next/server";
import { rankRotationCandidates } from "@/lib/admin-rotation";
import { getTodayDateString } from "@/lib/date";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

function latestById(rows: Array<{ id: string; date: string }>) {
  const lastUsed = new Map<string, string>();
  for (const row of rows) {
    const current = lastUsed.get(row.id);
    if (!current || row.date > current) lastUsed.set(row.id, row.date);
  }
  return lastUsed;
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const activeDate = req.nextUrl.searchParams.get("date") ?? getTodayDateString();
    const [
      questsResult,
      questAssignmentsResult,
      questCompletionsResult,
      minigamesResult,
      minigameCompletionsResult,
    ] = await Promise.all([
      db.from("daily_quest_bank").select("id, title, type, difficulty, is_active").eq("is_active", true),
      db
        .from("daily_quest_assignments")
        .select("quest_id, active_date, daily_quest_bank(type, difficulty)")
        .order("active_date", { ascending: false }),
      db.from("daily_quest_completions").select("quest_id"),
      db.from("mini_games").select("id, title, type, difficulty, active_date, is_active").eq("is_active", true),
      db.from("mini_game_completions").select("minigame_id"),
    ]);

    const firstError =
      questsResult.error ||
      questAssignmentsResult.error ||
      questCompletionsResult.error ||
      minigamesResult.error ||
      minigameCompletionsResult.error;
    if (firstError) {
      return NextResponse.json({ error: "Gagal memuat rotation preview.", details: firstError.message }, { status: 503 });
    }

    const questLastUsed = latestById(
      (questAssignmentsResult.data ?? []).map((item) => ({
        id: item.quest_id,
        date: item.active_date,
      })),
    );
    const minigameLastUsed = latestById(
      (minigamesResult.data ?? [])
        .filter((item) => item.active_date)
        .map((item) => ({ id: item.id, date: item.active_date })),
    );
    const questCompletions = new Map<string, number>();
    const minigameCompletions = new Map<string, number>();
    questCompletionsResult.data?.forEach((item: { quest_id: string }) => {
      questCompletions.set(item.quest_id, (questCompletions.get(item.quest_id) ?? 0) + 1);
    });
    minigameCompletionsResult.data?.forEach((item: { minigame_id: string }) => {
      minigameCompletions.set(item.minigame_id, (minigameCompletions.get(item.minigame_id) ?? 0) + 1);
    });

    const recentAssignment = questAssignmentsResult.data?.[0];
    const recentQuest = Array.isArray(recentAssignment?.daily_quest_bank)
      ? recentAssignment?.daily_quest_bank[0]
      : recentAssignment?.daily_quest_bank;
    const recentMinigame = [...(minigamesResult.data ?? [])]
      .filter((item) => item.active_date)
      .sort((a, b) => String(b.active_date).localeCompare(String(a.active_date)))[0];

    const quests = rankRotationCandidates(
      (questsResult.data ?? []).map((quest) => ({
        id: quest.id,
        title: quest.title,
        category: quest.type,
        difficulty: quest.difficulty,
        lastUsedDate: questLastUsed.get(quest.id) ?? null,
        playCount: questCompletions.get(quest.id) ?? 0,
        recentCategoryPenalty: recentQuest?.type === quest.type,
        recentDifficultyPenalty: recentQuest?.difficulty === quest.difficulty,
      })),
      activeDate,
    ).slice(0, 8);

    const minigames = rankRotationCandidates(
      (minigamesResult.data ?? []).map((game) => ({
        id: game.id,
        title: game.title,
        category: game.type,
        difficulty: game.difficulty,
        lastUsedDate: minigameLastUsed.get(game.id) ?? null,
        playCount: minigameCompletions.get(game.id) ?? 0,
        recentCategoryPenalty: recentMinigame?.type === game.type,
        recentDifficultyPenalty: recentMinigame?.difficulty === game.difficulty,
      })),
      activeDate,
    ).slice(0, 8);

    return NextResponse.json({
      activeDate,
      quests,
      minigames,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal memuat rotation preview.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
