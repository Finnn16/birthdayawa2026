import { NextRequest, NextResponse } from "next/server";
import { getHeartBalance } from "@/lib/engagement";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = createServiceRoleClient();
    const payload = await req.json().catch(() => ({}));
    const { data: reward, error: rewardError } = await db
      .from("rewards")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (rewardError) {
      return NextResponse.json({ error: rewardError.message }, { status: 503 });
    }

    if (!reward) {
      return NextResponse.json({ error: "Reward tidak ditemukan." }, { status: 404 });
    }

    const balance = await getHeartBalance(db, user.id);
    if (balance < reward.cost_hearts) {
      return NextResponse.json({ error: "Hearts belum cukup untuk redeem reward ini." }, { status: 400 });
    }

    const { data: redemption, error: redemptionError } = await db
      .from("reward_redemptions")
      .insert({
        reward_id: id,
        user_id: user.id,
        status: "pending",
        cost_hearts: reward.cost_hearts,
        note: typeof payload.note === "string" ? payload.note.trim() : null,
      })
      .select()
      .single();

    if (redemptionError) {
      return NextResponse.json({ error: "Gagal membuat request reward.", details: redemptionError.message }, { status: 500 });
    }

    await db.from("heart_transactions").insert({
      user_id: user.id,
      source_type: "reward_hold",
      source_id: redemption.id,
      amount: -reward.cost_hearts,
      note: `Hold reward: ${reward.title}`,
    });

    return NextResponse.json({ redemption }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal redeem reward.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
