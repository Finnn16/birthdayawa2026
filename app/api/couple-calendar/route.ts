import { NextResponse } from "next/server";
import { getTodayDateString } from "@/lib/date";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = createServiceRoleClient();
    const today = getTodayDateString();
    const [customEvents, moods] = await Promise.all([
      db
        .from("couple_events")
        .select("*")
        .eq("is_active", true)
        .in("visibility", ["user", "both"])
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(40),
      db
        .from("moods")
        .select("id, date, rating")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(30),
    ]);

    return NextResponse.json({
      events: customEvents.data ?? [],
      moods: moods.data ?? [],
      quests: [],
      rewards: [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memuat couple calendar.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
