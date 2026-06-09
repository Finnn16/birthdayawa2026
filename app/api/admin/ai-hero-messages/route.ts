import { NextRequest, NextResponse } from "next/server";
import { createAiHeroMessageForMood, generateDailyAiHeroMessages } from "@/lib/ai-hero-messages";
import { getTodayDateString } from "@/lib/date";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

export async function GET() {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const { data, error: listError } = await db
      .from("ai_hero_messages")
      .select("*, users(username, email), moods(date, rating, note)")
      .order("active_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60);

    if (listError) {
      return NextResponse.json(
        { error: "Gagal memuat AI hero messages.", details: listError.message },
        { status: 500 },
      );
    }

    const messages = data ?? [];
    const total = messages.length;
    const aiCount = messages.filter((message) => message.generation_source === "ai").length;
    const fallbackCount = messages.filter((message) => message.generation_source === "fallback").length;
    const requiresReviewCount = messages.filter((message) => message.requires_review).length;

    return NextResponse.json({
      messages,
      stats: {
        total,
        aiCount,
        fallbackCount,
        requiresReviewCount,
        aiSuccessRate: total ? Math.round((aiCount / total) * 100) : 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal memuat AI hero messages.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const payload = await req.json().catch(() => ({}));
    const db = createServiceRoleClient();

    if (typeof payload.mood_id === "string" && payload.mood_id) {
      const { data: mood, error: moodError } = await db
        .from("moods")
        .select("id, user_id, date, rating, note")
        .eq("id", payload.mood_id)
        .single();

      if (moodError || !mood) {
        return NextResponse.json(
          { error: "Mood tidak ditemukan.", details: moodError?.message },
          { status: 404 },
        );
      }

      const activeDate =
        typeof payload.active_date === "string" && payload.active_date
          ? payload.active_date
          : getTodayDateString();
      const result = await createAiHeroMessageForMood(db, mood, activeDate, {
        force: payload.force === true,
      });
      return NextResponse.json({ success: true, ...result });
    }

    const activeDate =
      typeof payload.active_date === "string" && payload.active_date
        ? payload.active_date
        : getTodayDateString();
    const result = await generateDailyAiHeroMessages(db, activeDate, {
      force: payload.force === true,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal generate AI hero message.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
