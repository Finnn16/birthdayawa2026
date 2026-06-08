import { NextRequest, NextResponse } from "next/server";
import { getPublishPatch } from "@/lib/admin-publishing";
import { MAX_ACTIVE_MINI_GAMES } from "@/lib/app-config";
import { getTodayDateString } from "@/lib/date";
import { normalizeOptions, validateMiniGamePayload, wouldExceedActiveLimit } from "@/lib/minigames";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

function isMissingHeartsRewardColumn(error: { message?: string; code?: string } | null) {
  return (
    error?.code === "PGRST204" &&
    error.message?.toLowerCase().includes("hearts_reward")
  );
}

export async function GET() {
  try {
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
        details: listError.message,
        code: listError.code,
      });
    }

    return NextResponse.json({ minigames: data ?? [], setupRequired: false });
  } catch (error) {
    console.error("Mini-game admin list error:", error);
    return NextResponse.json({
      minigames: [],
      error: "Gagal memuat mini-game.",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user, error } = await requireAdmin();

    if (!user && error === "Unauthorized") {
      return NextResponse.json({ error }, { status: 401 });
    }

    if (error === "Forbidden") {
      return NextResponse.json({ error }, { status: 403 });
    }

    const adminDb = createServiceRoleClient();
    const payload = await req.json();
    const publishPatch = getPublishPatch(
      payload.publish_status ?? (payload.is_active === false ? "draft" : "published"),
      payload.publish_at ?? payload.active_date,
      "minigames",
    );
    const willBeActive = publishPatch.is_active === true;
    const validationError = validateMiniGamePayload(payload);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (willBeActive) {
      const { count, error: countError } = await adminDb
        .from("mini_games")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);

      if (countError) {
        return NextResponse.json(
          {
            error: "Mini-game table belum siap. Jalankan migration database terlebih dulu.",
            details: countError.message,
            code: countError.code,
          },
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

    const insertPayload = {
      title: String(payload.title).trim(),
      description: typeof payload.description === "string" ? payload.description.trim() : null,
      type: payload.type,
      difficulty: payload.difficulty,
      xp_reward: payload.xp_reward,
      hearts_reward: typeof payload.hearts_reward === "number" ? payload.hearts_reward : 0,
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
      ...publishPatch,
      created_by: creatorProfile?.id ?? null,
    };

    let { data, error: insertError } = await adminDb
      .from("mini_games")
      .insert(insertPayload)
      .select()
      .single();

    if (isMissingHeartsRewardColumn(insertError)) {
      const { hearts_reward: _heartsReward, ...fallbackPayload } = insertPayload;
      const fallbackResult = await adminDb
        .from("mini_games")
        .insert(fallbackPayload)
        .select()
        .single();

      data = fallbackResult.data;
      insertError = fallbackResult.error;
    }

    if (insertError) {
      console.error("Mini-game insert error:", insertError);
      return NextResponse.json(
        {
          error: "Gagal membuat mini-game.",
          details: insertError.message,
          code: insertError.code,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ minigame: data }, { status: 201 });
  } catch (error) {
    console.error("Mini-game admin create error:", error);
    return NextResponse.json(
      {
        error: "Gagal membuat mini-game.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
