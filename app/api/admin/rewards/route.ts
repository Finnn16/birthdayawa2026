import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

export async function GET() {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const { data, error: rewardsError } = await db
      .from("rewards")
      .select("*")
      .order("created_at", { ascending: false });

    if (rewardsError) return NextResponse.json({ rewards: [], error: rewardsError.message }, { status: 503 });
    return NextResponse.json({ rewards: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: "Gagal memuat rewards.", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
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
      return NextResponse.json({ error: "Reward title wajib diisi." }, { status: 400 });
    }
    if (typeof payload.cost_hearts !== "number" || payload.cost_hearts < 0) {
      return NextResponse.json({ error: "Cost Hearts tidak valid." }, { status: 400 });
    }

    const { data: creatorProfile } = await db.from("users").select("id").eq("id", user.id).maybeSingle();
    const { data, error: insertError } = await db
      .from("rewards")
      .insert({
        title: payload.title.trim(),
        description: typeof payload.description === "string" ? payload.description.trim() : null,
        cost_hearts: payload.cost_hearts,
        category: typeof payload.category === "string" && payload.category ? payload.category : "experience",
        is_active: payload.is_active !== false,
        requires_admin_approval: true,
        stock_limit: typeof payload.stock_limit === "number" ? payload.stock_limit : null,
        metadata_json: payload.metadata_json ?? null,
        created_by: creatorProfile?.id ?? null,
      })
      .select()
      .single();

    if (insertError) return NextResponse.json({ error: "Gagal membuat reward.", details: insertError.message }, { status: 500 });
    return NextResponse.json({ reward: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Gagal membuat reward.", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
