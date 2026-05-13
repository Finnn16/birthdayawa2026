import { NextResponse } from "next/server";
import { getTodayDateString } from "@/lib/date";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";

export async function GET() {
  const { supabase, user, error } = await getAuthenticatedUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appDb = createServiceRoleClient();
  const today = getTodayDateString();
  const { data: games, error: gamesError } = await appDb
    .from("mini_games")
    .select("*")
    .eq("is_active", true)
    .or(`active_date.is.null,active_date.eq.${today}`)
    .order("active_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3);

  if (gamesError) {
    return NextResponse.json({
      minigames: [],
      completions: [],
      setupRequired: true,
      message: "Mini-game belum siap. Jalankan migration database terlebih dulu.",
    });
  }

  const ids = games?.map((game) => game.id) ?? [];
  const { data: completions } = ids.length
    ? await appDb
        .from("mini_game_completions")
        .select("*")
        .eq("user_id", user.id)
        .in("minigame_id", ids)
    : { data: [] };

  return NextResponse.json({
    minigames: games ?? [],
    completions: completions ?? [],
    setupRequired: false,
  });
}
