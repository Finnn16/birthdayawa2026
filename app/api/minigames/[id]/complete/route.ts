import { NextRequest, NextResponse } from "next/server";
import { getTodayDateString } from "@/lib/date";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";
import { calculateMiniGameXP } from "@/lib/xp";
import { checkMiniGameAnswer } from "@/lib/minigames";

type Params = {
  params: Promise<{ id: string }>;
};

function isMissingHeartsEarnedColumn(error: { message?: string; code?: string } | null) {
  return (
    error?.code === "PGRST204" &&
    error.message?.toLowerCase().includes("hearts_earned")
  );
}

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

  const isCorrect = checkMiniGameAnswer(payload.answer, game.correct_answer, game.type);
  const xpResult = calculateMiniGameXP(game.xp_reward, isCorrect);
  const heartsEarned = isCorrect ? Math.max(0, Number(game.hearts_reward ?? 0)) : 0;

  const { data: existing } = await appDb
    .from("mini_game_completions")
    .select("*")
    .eq("minigame_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.is_correct) {
    return NextResponse.json(
      { error: "Mini-game ini sudah diselesaikan." },
      { status: 409 },
    );
  }

  const completionPayload = {
    minigame_id: id,
    user_id: user.id,
    is_correct: isCorrect,
    xp_earned: xpResult.finalXP,
    hearts_earned: heartsEarned,
    metadata_json: {
      answer: payload.answer ?? null,
    },
  };

  let completion = null;
  let completionError = null;

  if (existing) {
    const updatePayload = {
      is_correct: isCorrect,
      xp_earned: xpResult.finalXP,
      hearts_earned: heartsEarned,
      metadata_json: {
        answer: payload.answer ?? null,
        previous_answer: existing.metadata_json ?? null,
      },
    };

    const updateResult = await appDb
      .from("mini_game_completions")
      .update(updatePayload)
      .eq("id", existing.id)
      .select()
      .single();

    completion = updateResult.data;
    completionError = updateResult.error;

    if (isMissingHeartsEarnedColumn(completionError)) {
      const { hearts_earned: _heartsEarned, ...fallbackPayload } = updatePayload;
      const fallbackResult = await appDb
        .from("mini_game_completions")
        .update(fallbackPayload)
        .eq("id", existing.id)
        .select()
        .single();

      completion = fallbackResult.data;
      completionError = fallbackResult.error;
    }
  } else {
    const insertResult = await appDb
      .from("mini_game_completions")
      .insert(completionPayload)
      .select()
      .single();

    completion = insertResult.data;
    completionError = insertResult.error;
  }

  if (!existing && isMissingHeartsEarnedColumn(completionError)) {
    const { hearts_earned: _heartsEarned, ...fallbackPayload } = completionPayload;
    const fallbackResult = await appDb
      .from("mini_game_completions")
      .insert(fallbackPayload)
      .select()
      .single();

    completion = fallbackResult.data;
    completionError = fallbackResult.error;
  }

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

  if (xpResult.finalXP > 0) {
    await appDb.from("xp_transactions").insert({
      user_id: user.id,
      source_type: "minigame",
      source_id: id,
      xp_amount: xpResult.baseXP,
      multiplier: xpResult.multiplier,
      final_xp: xpResult.finalXP,
    });
  }

  if (heartsEarned > 0) {
    await appDb.from("heart_transactions").insert({
      user_id: user.id,
      source_type: "minigame_bonus",
      source_id: id,
      amount: heartsEarned,
      note: `Mini-game: ${game.title}`,
      metadata_json: {
        minigame_id: id,
        completion_id: completion.id,
        is_correct: isCorrect,
      },
    });
  }

  return NextResponse.json({
    completion,
    isCorrect,
    xpEarned: xpResult.finalXP,
    heartsEarned,
  });
}
