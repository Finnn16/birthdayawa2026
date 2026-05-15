import { NextRequest, NextResponse } from "next/server";
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
    const [{ data: quests }, { data: assignments }, { data: assigner }] = await Promise.all([
      db.from("daily_quest_bank").select("*").eq("is_active", true),
      db.from("daily_quest_assignments").select("quest_id, active_date"),
      db.from("users").select("id").eq("id", user.id).maybeSingle(),
    ]);
    const lastUsed = new Map<string, string>();
    assignments?.forEach((item: { quest_id: string; active_date: string }) => {
      const current = lastUsed.get(item.quest_id);
      if (!current || item.active_date > current) lastUsed.set(item.quest_id, item.active_date);
    });

    const picks = [...(quests ?? [])]
      .sort((a, b) => (lastUsed.get(a.id) ?? "").localeCompare(lastUsed.get(b.id) ?? ""))
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
    return NextResponse.json({ assignments: data ?? [] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Gagal auto-pick quest.", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
