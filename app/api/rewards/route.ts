import { NextResponse } from "next/server";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = createServiceRoleClient();
    const { data, error: rewardsError } = await db
      .from("rewards")
      .select("*")
      .eq("is_active", true)
      .order("cost_hearts", { ascending: true });

    if (rewardsError) {
      return NextResponse.json({ rewards: [], error: rewardsError.message }, { status: 503 });
    }

    return NextResponse.json({ rewards: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memuat rewards.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
