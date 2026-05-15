import { NextRequest, NextResponse } from "next/server";
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
    if (typeof payload.title === "string") update.title = payload.title.trim();
    if (typeof payload.description === "string") update.description = payload.description.trim();
    if (typeof payload.cost_hearts === "number") update.cost_hearts = payload.cost_hearts;
    if (typeof payload.category === "string") update.category = payload.category;
    if (typeof payload.is_active === "boolean") update.is_active = payload.is_active;
    if (typeof payload.stock_limit === "number" || payload.stock_limit === null) update.stock_limit = payload.stock_limit;
    if (payload.metadata_json !== undefined) update.metadata_json = payload.metadata_json;
    update.requires_admin_approval = true;

    const { data, error: updateError } = await db.from("rewards").update(update).eq("id", id).select().single();
    if (updateError) return NextResponse.json({ error: "Gagal update reward.", details: updateError.message }, { status: 500 });
    return NextResponse.json({ reward: data });
  } catch (error) {
    return NextResponse.json({ error: "Gagal update reward.", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
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
      .from("rewards")
      .select("id, is_active")
      .eq("id", id)
      .maybeSingle();

    if (existingError) return NextResponse.json({ error: "Gagal cek reward.", details: existingError.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: "Reward tidak ditemukan." }, { status: 404 });
    if (existing.is_active) return NextResponse.json({ error: "Deactivate reward dulu sebelum dihapus." }, { status: 400 });

    const { error: deleteError } = await db.from("rewards").delete().eq("id", id);
    if (deleteError) return NextResponse.json({ error: "Gagal menghapus reward.", details: deleteError.message }, { status: 500 });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: "Gagal menghapus reward.", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
