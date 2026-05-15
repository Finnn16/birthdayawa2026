import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const payload = await req.json();
    const db = createServiceRoleClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof payload.title === "string") {
      if (!payload.title.trim()) {
        return NextResponse.json({ error: "Hero title wajib diisi." }, { status: 400 });
      }
      patch.title = payload.title.trim();
    }
    if (typeof payload.body === "string") {
      if (!payload.body.trim()) {
        return NextResponse.json({ error: "Hero body wajib diisi." }, { status: 400 });
      }
      patch.body = payload.body.trim();
    }
    if (typeof payload.tone === "string") patch.tone = payload.tone || "soft";
    if ("active_date" in payload) {
      patch.active_date = typeof payload.active_date === "string" && payload.active_date ? payload.active_date : null;
    }
    if (typeof payload.is_active === "boolean") patch.is_active = payload.is_active;
    if ("metadata_json" in payload) patch.metadata_json = payload.metadata_json ?? null;

    const { data, error: updateError } = await db
      .from("hero_messages")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: "Gagal update hero message.", details: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ heroMessage: data });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal update hero message.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const { data: existing, error: existingError } = await db
      .from("hero_messages")
      .select("id, is_active")
      .eq("id", id)
      .maybeSingle();

    if (existingError) return NextResponse.json({ error: "Gagal cek hero message.", details: existingError.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: "Hero message tidak ditemukan." }, { status: 404 });
    if (existing.is_active) return NextResponse.json({ error: "Deactivate hero copy dulu sebelum dihapus." }, { status: 400 });

    const { error: deleteError } = await db.from("hero_messages").delete().eq("id", id);
    if (deleteError) return NextResponse.json({ error: "Gagal menghapus hero message.", details: deleteError.message }, { status: 500 });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal menghapus hero message.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
