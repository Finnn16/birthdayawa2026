import { NextRequest, NextResponse } from "next/server";
import { normalizeJsonList } from "@/lib/engagement";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const payload = await req.json();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of ["title", "description", "type", "difficulty", "prompt", "correct_answer"]) {
      if (typeof payload[key] === "string") update[key] = payload[key].trim();
    }
    if (payload.options_json !== undefined) update.options_json = normalizeJsonList(payload.options_json);
    if (typeof payload.xp_reward === "number") update.xp_reward = payload.xp_reward;
    if (typeof payload.hearts_reward === "number") update.hearts_reward = payload.hearts_reward;
    if (typeof payload.is_active === "boolean") update.is_active = payload.is_active;
    if (payload.metadata_json !== undefined) update.metadata_json = payload.metadata_json;

    const { data, error: updateError } = await db.from("daily_quest_bank").update(update).eq("id", id).select().single();
    if (updateError) return NextResponse.json({ error: "Gagal update quest.", details: updateError.message }, { status: 500 });
    return NextResponse.json({ quest: data });
  } catch (error) {
    return NextResponse.json({ error: "Gagal update quest.", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const { data: existing, error: existingError } = await db
      .from("daily_quest_bank")
      .select("id, is_active")
      .eq("id", id)
      .maybeSingle();

    if (existingError) return NextResponse.json({ error: "Gagal cek quest.", details: existingError.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: "Quest tidak ditemukan." }, { status: 404 });
    if (existing.is_active) return NextResponse.json({ error: "Deactivate quest dulu sebelum dihapus." }, { status: 400 });

    const { error: deleteError } = await db.from("daily_quest_bank").delete().eq("id", id);
    if (deleteError) return NextResponse.json({ error: "Gagal menghapus quest.", details: deleteError.message }, { status: 500 });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: "Gagal menghapus quest.", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
