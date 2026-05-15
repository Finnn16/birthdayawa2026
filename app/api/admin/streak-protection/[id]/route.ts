import { NextRequest, NextResponse } from "next/server";
import { recalculateUserMoodStreaks } from "@/lib/streak-protection";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const payload = await req.json();
    const status = payload.status === "approved" ? "approved" : payload.status === "rejected" ? "rejected" : null;
    if (!status) return NextResponse.json({ error: "Status harus approved atau rejected." }, { status: 400 });

    const db = createServiceRoleClient();
    const { data: request, error: requestError } = await db
      .from("streak_protection_logs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (requestError) return NextResponse.json({ error: requestError.message }, { status: 503 });
    if (!request) return NextResponse.json({ error: "Request tidak ditemukan." }, { status: 404 });
    if (request.status !== "pending") {
      return NextResponse.json({ error: "Request ini sudah diproses." }, { status: 409 });
    }

    if (status === "approved") {
      const { data: item } = await db
        .from("user_inventory")
        .select("*")
        .eq("user_id", request.user_id)
        .eq("item_type", request.item_type)
        .maybeSingle();

      if (!item || item.quantity <= 0) {
        return NextResponse.json({ error: "Inventory user tidak cukup untuk approve request ini." }, { status: 400 });
      }

      await db
        .from("user_inventory")
        .update({ quantity: item.quantity - 1, updated_at: new Date().toISOString() })
        .eq("id", item.id);
    }

    const now = new Date().toISOString();
    const { data, error: updateError } = await db
      .from("streak_protection_logs")
      .update({
        status,
        approved_at: status === "approved" ? now : null,
        reviewed_by: user.id,
        admin_note: typeof payload.admin_note === "string" ? payload.admin_note.trim() : null,
      })
      .eq("id", id)
      .select("*, users(username, email)")
      .single();

    if (updateError) {
      return NextResponse.json({ error: "Gagal update request.", details: updateError.message }, { status: 500 });
    }

    if (status === "approved") {
      await recalculateUserMoodStreaks(db, request.user_id);
    }

    return NextResponse.json({ request: data });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memproses request streak protection.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
