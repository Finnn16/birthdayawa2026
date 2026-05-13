import { NextRequest, NextResponse } from "next/server";
import { MAX_ACTIVE_MINI_GAMES } from "@/lib/app-config";
import { getTodayDateString } from "@/lib/date";
import { normalizeOptions, validateMiniGamePayload, wouldExceedActiveLimit } from "@/lib/minigames";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

export async function GET() {
  const { supabase, user, error } = await requireAdmin();

  if (!user && error === "Unauthorized") {
    return NextResponse.json({ error }, { status: 401 });
  }

  if (error === "Forbidden") {
    return NextResponse.json({ error }, { status: 403 });
  }

  const adminDb = createServiceRoleClient();
  const { data, error: listError } = await adminDb
    .from("mini_games")
    .select("*")
    .order("created_at", { ascending: false });

  if (listError) {
    return NextResponse.json({
      minigames: [],
      setupRequired: true,
      message: "Mini-game belum siap. Jalankan migration database terlebih dulu.",
    });
  }

  return NextResponse.json({ minigames: data ?? [], setupRequired: false });
}

export async function POST(req: NextRequest) {
  const { supabase, user, error } = await requireAdmin();

  if (!user && error === "Unauthorized") {
    return NextResponse.json({ error }, { status: 401 });
  }

  if (error === "Forbidden") {
    return NextResponse.json({ error }, { status: 403 });
  }

  const adminDb = createServiceRoleClient();
  const payload = await req.json();
  const validationError = validateMiniGamePayload(payload);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (payload.is_active) {
    const { count, error: countError } = await adminDb
      .from("mini_games")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    if (countError) {
      return NextResponse.json(
        { error: "Mini-game table belum siap. Jalankan migration database terlebih dulu." },
        { status: 503 },
      );
    }

    if (wouldExceedActiveLimit(count ?? 0)) {
      return NextResponse.json(
        { error: `Maksimal ${MAX_ACTIVE_MINI_GAMES} mini-game aktif.` },
        { status: 400 },
      );
    }
  }

  const { data: creatorProfile } = await adminDb
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const { data, error: insertError } = await adminDb
    .from("mini_games")
    .insert({
      title: String(payload.title).trim(),
      description: typeof payload.description === "string" ? payload.description.trim() : null,
      type: payload.type,
      difficulty: payload.difficulty,
      xp_reward: payload.xp_reward,
      active_date:
        typeof payload.active_date === "string" && payload.active_date
          ? payload.active_date
          : getTodayDateString(),
      is_active: Boolean(payload.is_active),
      prompt: typeof payload.prompt === "string" ? payload.prompt.trim() : null,
      options_json: normalizeOptions(payload.options_json),
      correct_answer:
        typeof payload.correct_answer === "string" && payload.correct_answer.trim()
          ? payload.correct_answer.trim()
          : null,
      metadata_json: payload.metadata_json ?? null,
      created_by: creatorProfile?.id ?? null,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Mini-game insert error:", insertError);
    return NextResponse.json(
      {
        error: "Gagal membuat mini-game.",
        details:
          process.env.NODE_ENV === "production"
            ? undefined
            : insertError.message,
        code: process.env.NODE_ENV === "production" ? undefined : insertError.code,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ minigame: data }, { status: 201 });
}
