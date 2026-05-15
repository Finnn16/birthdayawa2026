import { NextRequest, NextResponse } from "next/server";
import { normalizeJsonList, QUEST_DIFFICULTIES, QUEST_TYPES } from "@/lib/engagement";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

export async function GET() {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const [{ data: quests, error: questsError }, { data: assignments }] = await Promise.all([
      db.from("daily_quest_bank").select("*").order("created_at", { ascending: false }),
      db.from("daily_quest_assignments").select("quest_id, active_date").order("active_date", { ascending: false }),
    ]);
    if (questsError) return NextResponse.json({ quests: [], error: questsError.message }, { status: 503 });

    const used = new Map<string, string>();
    assignments?.forEach((item: { quest_id: string; active_date: string }) => {
      if (!used.has(item.quest_id)) used.set(item.quest_id, item.active_date);
    });

    return NextResponse.json({
      quests: quests?.map((quest: any) => ({
        ...quest,
        used: used.has(quest.id),
        last_used_date: used.get(quest.id) ?? null,
      })) ?? [],
    });
  } catch (error) {
    return NextResponse.json({ error: "Gagal memuat quest bank.", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const payload = await req.json();
    if (!payload.title || typeof payload.title !== "string") {
      return NextResponse.json({ error: "Quest title wajib diisi." }, { status: 400 });
    }
    if (!QUEST_TYPES.includes(payload.type)) payload.type = "reflection";
    if (!QUEST_DIFFICULTIES.includes(payload.difficulty)) payload.difficulty = "easy";

    const { data: creatorProfile } = await db.from("users").select("id").eq("id", user.id).maybeSingle();
    const { data, error: insertError } = await db
      .from("daily_quest_bank")
      .insert({
        title: payload.title.trim(),
        description: typeof payload.description === "string" ? payload.description.trim() : null,
        type: payload.type,
        difficulty: payload.difficulty,
        xp_reward: Number(payload.xp_reward) || 0,
        hearts_reward: Number(payload.hearts_reward) || 0,
        prompt: typeof payload.prompt === "string" ? payload.prompt.trim() : null,
        options_json: normalizeJsonList(payload.options_json),
        correct_answer: typeof payload.correct_answer === "string" && payload.correct_answer.trim() ? payload.correct_answer.trim() : null,
        is_active: payload.is_active !== false,
        metadata_json: payload.metadata_json ?? null,
        created_by: creatorProfile?.id ?? null,
      })
      .select()
      .single();

    if (insertError) return NextResponse.json({ error: "Gagal membuat quest.", details: insertError.message }, { status: 500 });
    return NextResponse.json({ quest: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Gagal membuat quest.", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
