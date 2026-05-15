import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

export async function GET() {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const { data, error: listError } = await db
      .from("hero_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40);

    if (listError) {
      return NextResponse.json({ heroMessages: [], error: listError.message }, { status: 503 });
    }

    return NextResponse.json({ heroMessages: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memuat hero messages.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
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
      return NextResponse.json({ error: "Hero title wajib diisi." }, { status: 400 });
    }
    if (!payload.body || typeof payload.body !== "string") {
      return NextResponse.json({ error: "Hero body wajib diisi." }, { status: 400 });
    }

    const { data: creator } = await db.from("users").select("id").eq("id", user.id).maybeSingle();

    const { data, error: insertError } = await db
      .from("hero_messages")
      .insert({
        title: payload.title.trim(),
        body: payload.body.trim(),
        tone: typeof payload.tone === "string" && payload.tone ? payload.tone : "soft",
        active_date: typeof payload.active_date === "string" && payload.active_date ? payload.active_date : null,
        is_active: payload.is_active !== false,
        metadata_json: payload.metadata_json ?? null,
        created_by: creator?.id ?? null,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Gagal membuat hero message.", details: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ heroMessage: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal membuat hero message.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
