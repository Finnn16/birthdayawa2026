import { NextRequest, NextResponse } from "next/server";
import { getTodayDateString } from "@/lib/date";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";
import { calculateMiniGameXP } from "@/lib/xp";
import { checkMiniGameAnswer } from "@/lib/minigames";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { supabase, user, error } = await getAuthenticatedUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appDb = createServiceRoleClient();
  const payload = await req.json();
  const { data: game, error: gameError } = await appDb
    .from("mini_games")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (gameError) {
    return NextResponse.json(
      { error: "Mini-game belum siap. Jalankan migration database terlebih dulu." },
      { status: 503 },
    );
  }

  if (!game) {
    return NextResponse.json({ error: "Mini-game tidak ditemukan." }, { status: 404 });
  }

  if (game.active_date && game.active_date !== getTodayDateString()) {
    return NextResponse.json(
      { error: "Mini-game ini bukan jadwal hari ini." },
      { status: 400 },
    );
  }

  const { data: existing } = await appDb
    .from("mini_game_completions")
    .select("id")
    .eq("minigame_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Mini-game ini sudah diselesaikan." },
      { status: 409 },
    );
  }

  const isCorrect = checkMiniGameAnswer(payload.answer, game.correct_answer);
  const xpResult = calculateMiniGameXP(game.xp_reward, isCorrect);

  const { data: completion, error: completionError } = await appDb
    .from("mini_game_completions")
    .insert({
      minigame_id: id,
      user_id: user.id,
      is_correct: isCorrect,
      xp_earned: xpResult.finalXP,
      metadata_json: {
        answer: payload.answer ?? null,
      },
    })
    .select()
    .single();

  if (completionError) {
    if (completionError.code === "23505") {
      return NextResponse.json(
        { error: "Mini-game ini sudah diselesaikan." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Gagal menyimpan completion mini-game." },
      { status: 500 },
    );
  }

  await appDb.from("xp_transactions").insert({
    user_id: user.id,
    source_type: "minigame",
    source_id: id,
    xp_amount: xpResult.baseXP,
    multiplier: xpResult.multiplier,
    final_xp: xpResult.finalXP,
  });

  return NextResponse.json({
    completion,
    isCorrect,
    xpEarned: xpResult.finalXP,
  });
}
