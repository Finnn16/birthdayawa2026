import { NextRequest, NextResponse } from "next/server";
import { MAX_ACTIVE_MINI_GAMES } from "@/lib/app-config";
import { normalizeOptions, validateMiniGamePayload, wouldExceedActiveLimit } from "@/lib/minigames";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

type Params = {
  params: Promise<{ id: string }>;
};

function isMissingHeartsRewardColumn(error: { message?: string; code?: string } | null) {
  return (
    error?.code === "PGRST204" &&
    error.message?.toLowerCase().includes("hearts_reward")
  );
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { supabase, user, error } = await requireAdmin();

    if (!user && error === "Unauthorized") {
      return NextResponse.json({ error }, { status: 401 });
    }

    if (error === "Forbidden") {
      return NextResponse.json({ error }, { status: 403 });
    }

    const adminDb = createServiceRoleClient();
    const payload = await req.json();
    const { data: existing, error: existingError } = await adminDb
      .from("mini_games")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        {
          error: "Mini-game table belum siap. Jalankan migration database terlebih dulu.",
          details: existingError.message,
          code: existingError.code,
        },
        { status: 503 },
      );
    }

    if (!existing) {
      return NextResponse.json({ error: "Mini-game tidak ditemukan." }, { status: 404 });
    }

    const mergedPayload = { ...existing, ...payload };
    const validationError = validateMiniGamePayload(mergedPayload);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (payload.is_active) {
      const { count, error: countError } = await adminDb
        .from("mini_games")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .neq("id", id);

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

    const updatePayload = {
      title: String(mergedPayload.title).trim(),
      description:
        typeof mergedPayload.description === "string"
          ? mergedPayload.description.trim()
          : null,
      type: mergedPayload.type,
      difficulty: mergedPayload.difficulty,
      xp_reward: mergedPayload.xp_reward,
      hearts_reward:
        typeof mergedPayload.hearts_reward === "number"
          ? mergedPayload.hearts_reward
          : 0,
      active_date:
        typeof mergedPayload.active_date === "string" && mergedPayload.active_date
          ? mergedPayload.active_date
          : null,
      is_active: Boolean(mergedPayload.is_active),
      prompt: typeof mergedPayload.prompt === "string" ? mergedPayload.prompt.trim() : null,
      options_json: normalizeOptions(mergedPayload.options_json),
      correct_answer:
        typeof mergedPayload.correct_answer === "string" && mergedPayload.correct_answer.trim()
          ? mergedPayload.correct_answer.trim()
          : null,
      metadata_json: mergedPayload.metadata_json ?? null,
      updated_at: new Date().toISOString(),
    };

    let { data, error: updateError } = await adminDb
      .from("mini_games")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (isMissingHeartsRewardColumn(updateError)) {
      const { hearts_reward: _heartsReward, ...fallbackPayload } = updatePayload;
      const fallbackResult = await adminDb
        .from("mini_games")
        .update(fallbackPayload)
        .eq("id", id)
        .select()
        .single();

      data = fallbackResult.data;
      updateError = fallbackResult.error;
    }

    if (updateError) {
      return NextResponse.json(
        {
          error: "Gagal update mini-game.",
          details: updateError.message,
          code: updateError.code,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ minigame: data });
  } catch (error) {
    console.error("Mini-game admin update error:", error);
    return NextResponse.json(
      {
        error: "Gagal update mini-game.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { user, error } = await requireAdmin();

    if (!user && error === "Unauthorized") {
      return NextResponse.json({ error }, { status: 401 });
    }

    if (error === "Forbidden") {
      return NextResponse.json({ error }, { status: 403 });
    }

    const adminDb = createServiceRoleClient();
    const { data: existing, error: existingError } = await adminDb
      .from("mini_games")
      .select("id, is_active")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: "Gagal cek mini-game.", details: existingError.message },
        { status: 500 },
      );
    }

    if (!existing) {
      return NextResponse.json({ error: "Mini-game tidak ditemukan." }, { status: 404 });
    }

    if (existing.is_active) {
      return NextResponse.json(
        { error: "Deactivate mini-game dulu sebelum dihapus." },
        { status: 400 },
      );
    }

    const { error: deleteError } = await adminDb.from("mini_games").delete().eq("id", id);
    if (deleteError) {
      return NextResponse.json(
        { error: "Gagal menghapus mini-game.", details: deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal menghapus mini-game.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
