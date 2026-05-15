import { NextRequest, NextResponse } from "next/server";
import { grantInventoryItem, isRewardStatus } from "@/lib/engagement";
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
    if (!isRewardStatus(payload.status)) {
      return NextResponse.json({ error: "Status redemption tidak valid." }, { status: 400 });
    }

    const { data: existing, error: existingError } = await db
      .from("reward_redemptions")
      .select("*, rewards(title, metadata_json, category)")
      .eq("id", id)
      .maybeSingle();

    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 503 });
    if (!existing) return NextResponse.json({ error: "Redemption tidak ditemukan." }, { status: 404 });

    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
      status: payload.status,
      admin_note: typeof payload.admin_note === "string" ? payload.admin_note.trim() : existing.admin_note,
      updated_at: now,
    };
    if (payload.status === "approved") update.approved_at = now;
    if (payload.status === "fulfilled") update.fulfilled_at = now;

    const shouldRefund =
      ["rejected", "cancelled"].includes(payload.status) &&
      !["rejected", "cancelled"].includes(existing.status);

    if (shouldRefund) {
      await db.from("heart_transactions").insert({
        user_id: existing.user_id,
        source_type: "reward_refund",
        source_id: existing.id,
        amount: existing.cost_hearts,
        note: `Refund reward: ${existing.rewards?.title ?? "reward"}`,
      });
    }

    const { data, error: updateError } = await db
      .from("reward_redemptions")
      .update(update)
      .eq("id", id)
      .select("*, rewards(title, metadata_json, category)")
      .single();

    if (updateError) return NextResponse.json({ error: "Gagal update redemption.", details: updateError.message }, { status: 500 });

    if (payload.status === "fulfilled") {
      const itemType = data.rewards?.metadata_json?.item_type;
      if (typeof itemType === "string") {
        await grantInventoryItem(db, data.user_id, itemType, 1, "reward_shop");
      }
    }

    return NextResponse.json({ redemption: data });
  } catch (error) {
    return NextResponse.json({ error: "Gagal update redemption.", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
