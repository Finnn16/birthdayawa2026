import { NextResponse } from "next/server";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = createServiceRoleClient();
    const [customEvents, moods, quests, rewards] = await Promise.all([
      db
        .from("couple_events")
        .select("*")
        .eq("is_active", true)
        .in("visibility", ["user", "both"])
        .order("event_date", { ascending: false })
        .limit(40),
      db
        .from("moods")
        .select("id, date, rating")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(30),
      db
        .from("daily_quest_assignments")
        .select("id, active_date, daily_quest_bank(title)")
        .eq("is_active", true)
        .order("active_date", { ascending: false })
        .limit(30),
      db
        .from("reward_redemptions")
        .select("id, requested_at, status, rewards(title)")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false })
        .limit(20),
    ]);

    return NextResponse.json({
      events: customEvents.data ?? [],
      moods: moods.data ?? [],
      quests: quests.data ?? [],
      rewards: rewards.data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memuat couple calendar.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
