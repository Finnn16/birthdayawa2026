import { NextResponse } from "next/server";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = createServiceRoleClient();
    const { data, error: redemptionsError } = await db
      .from("reward_redemptions")
      .select("*, rewards(title, category)")
      .eq("user_id", user.id)
      .order("requested_at", { ascending: false })
      .limit(20);

    if (redemptionsError) {
      return NextResponse.json({ redemptions: [], error: redemptionsError.message }, { status: 503 });
    }

    return NextResponse.json({ redemptions: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memuat redemption.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
