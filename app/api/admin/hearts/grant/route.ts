import { NextRequest, NextResponse } from "next/server";
import { getTargetUserId } from "@/lib/engagement";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const payload = await req.json();
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount === 0) {
      return NextResponse.json({ error: "Amount Hearts tidak valid." }, { status: 400 });
    }

    const userId = typeof payload.user_id === "string" && payload.user_id ? payload.user_id : await getTargetUserId(db);
    if (!userId) return NextResponse.json({ error: "Target user tidak ditemukan." }, { status: 404 });

    const { data: creatorProfile } = await db.from("users").select("id").eq("id", user.id).maybeSingle();
    const { data, error: insertError } = await db
      .from("heart_transactions")
      .insert({
        user_id: userId,
        source_type: "admin_bonus",
        amount,
        note: typeof payload.note === "string" ? payload.note.trim() : null,
        created_by: creatorProfile?.id ?? null,
      })
      .select()
      .single();

    if (insertError) return NextResponse.json({ error: "Gagal grant Hearts.", details: insertError.message }, { status: 500 });
    return NextResponse.json({ transaction: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Gagal grant Hearts.", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
