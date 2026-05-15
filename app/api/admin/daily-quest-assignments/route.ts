import { NextRequest, NextResponse } from "next/server";
import { getTodayDateString } from "@/lib/date";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const payload = await req.json();
    if (!payload.quest_id) return NextResponse.json({ error: "quest_id wajib diisi." }, { status: 400 });
    const { data: assigner } = await db.from("users").select("id").eq("id", user.id).maybeSingle();
    const { data, error: insertError } = await db
      .from("daily_quest_assignments")
      .insert({
        quest_id: payload.quest_id,
        active_date: typeof payload.active_date === "string" ? payload.active_date : getTodayDateString(),
        is_active: payload.is_active !== false,
        assigned_by: assigner?.id ?? null,
      })
      .select()
      .single();
    if (insertError) return NextResponse.json({ error: "Gagal assign quest.", details: insertError.message }, { status: 500 });
    return NextResponse.json({ assignment: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Gagal assign quest.", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
