import { NextRequest, NextResponse } from "next/server";
import { rankRotationCandidates } from "@/lib/admin-rotation";
import { getTodayDateString } from "@/lib/date";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const payload = await req.json().catch(() => ({}));
    const activeDate = typeof payload.active_date === "string" ? payload.active_date : getTodayDateString();
    const limit = Math.min(3, Math.max(1, Number(payload.limit) || 1));
    const [{ data: quests }, { data: assignments }, { data: completions }, { data: assigner }] = await Promise.all([
      db.from("daily_quest_bank").select("*").eq("is_active", true),
      db
        .from("daily_quest_assignments")
        .select("quest_id, active_date, daily_quest_bank(type, difficulty)")
        .order("active_date", { ascending: false }),
      db.from("daily_quest_completions").select("quest_id"),
      db.from("users").select("id").eq("id", user.id).maybeSingle(),
    ]);
    const lastUsed = new Map<string, string>();
    const completionCount = new Map<string, number>();
    assignments?.forEach((item: { quest_id: string; active_date: string }) => {
      const current = lastUsed.get(item.quest_id);
      if (!current || item.active_date > current) lastUsed.set(item.quest_id, item.active_date);
    });
    completions?.forEach((item: { quest_id: string }) => {
      completionCount.set(item.quest_id, (completionCount.get(item.quest_id) ?? 0) + 1);
    });

    const recentAssignment = assignments?.[0];
    const recentQuest = Array.isArray(recentAssignment?.daily_quest_bank)
      ? recentAssignment?.daily_quest_bank[0]
      : recentAssignment?.daily_quest_bank;

    const picks = rankRotationCandidates(
      (quests ?? []).map((quest) => ({
        id: quest.id,
        title: quest.title,
        category: quest.type,
        difficulty: quest.difficulty,
        lastUsedDate: lastUsed.get(quest.id) ?? null,
        playCount: completionCount.get(quest.id) ?? 0,
        recentCategoryPenalty: recentQuest?.type === quest.type,
        recentDifficultyPenalty: recentQuest?.difficulty === quest.difficulty,
      })),
      activeDate,
    )
      .slice(0, limit);

    if (picks.length === 0) {
      return NextResponse.json({ error: "Tidak ada quest aktif untuk dipilih." }, { status: 400 });
    }

    const { data, error: insertError } = await db
      .from("daily_quest_assignments")
      .insert(
        picks.map((quest) => ({
          quest_id: quest.id,
          active_date: activeDate,
          is_active: true,
          assigned_by: assigner?.id ?? null,
        })),
      )
      .select();

    if (insertError) return NextResponse.json({ error: "Gagal auto-pick quest.", details: insertError.message }, { status: 500 });
    return NextResponse.json({ assignments: data ?? [], picks }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Gagal auto-pick quest.", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
