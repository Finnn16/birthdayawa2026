import { NextRequest, NextResponse } from "next/server";
import { getTodayDateString } from "@/lib/date";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

export async function GET() {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const { data, error: listError } = await db.from("couple_events").select("*").order("event_date", { ascending: false }).limit(80);
    if (listError) return NextResponse.json({ events: [], error: listError.message }, { status: 503 });
    return NextResponse.json({ events: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: "Gagal memuat events.", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const payload = await req.json();
    if (!payload.title || typeof payload.title !== "string") return NextResponse.json({ error: "Title event wajib diisi." }, { status: 400 });
    const { data: creator } = await db.from("users").select("id").eq("id", user.id).maybeSingle();
    const { data, error: insertError } = await db
      .from("couple_events")
      .insert({
        title: payload.title.trim(),
        description: typeof payload.description === "string" ? payload.description.trim() : null,
        event_date: typeof payload.event_date === "string" ? payload.event_date : getTodayDateString(),
        event_type: typeof payload.event_type === "string" ? payload.event_type : "custom",
        visibility: typeof payload.visibility === "string" ? payload.visibility : "both",
        is_special: Boolean(payload.is_special),
        is_active: payload.is_active !== false,
        metadata_json: payload.metadata_json ?? null,
        created_by: creator?.id ?? null,
      })
      .select()
      .single();
    if (insertError) return NextResponse.json({ error: "Gagal membuat event.", details: insertError.message }, { status: 500 });
    return NextResponse.json({ event: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Gagal membuat event.", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
