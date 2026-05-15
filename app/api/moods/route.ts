import { NextRequest, NextResponse } from "next/server";
import { getTodayDateString } from "@/lib/date";
import { getGardenItemTypeForMood } from "@/lib/engagement";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";
import { getNextMoodStreakDay } from "@/lib/streak-protection";
import { calculateMoodXP } from "@/lib/xp";
import { getUserProgress } from "@/lib/progress";

export async function POST(req: NextRequest) {
  const { supabase, user, error: authError } = await getAuthenticatedUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rating, note } = await req.json();

  // Validate rating
  if (!rating || typeof rating !== "number" || rating < 1 || rating > 10) {
    return NextResponse.json(
      { error: "Rating harus angka 1-10" },
      { status: 400 },
    );
  }

  const today = getTodayDateString();

  // BACKEND CONSTRAINT: cek 1 hari 1 input
  const { data: existing } = await supabase
    .from("moods")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Lo udah isi mood hari ini. Sampai besok ya!" },
      { status: 409 },
    );
  }

  const appDb = createServiceRoleClient();

  // Hitung streak, termasuk tanggal yang sudah diproteksi admin.
  const streakDay = await getNextMoodStreakDay(appDb, user.id, today);
  const xpResult = calculateMoodXP(streakDay);
  const xpEarned = xpResult.finalXP;

  // Get response message dari DB (bukan hardcode)
  const { data: responseData } = await supabase
    .from("responses")
    .select("message")
    .lte("range_min", rating)
    .gte("range_max", rating)
    .single();

  // Insert mood
  const { data: mood, error: insertError } = await supabase
    .from("moods")
    .insert({
      user_id: user.id,
      date: today,
      rating,
      note: note?.trim() || null,
      xp_earned: xpEarned,
      streak_day: streakDay,
    })
    .select()
    .single();

  if (insertError) {
    // Handle unique constraint violation dari DB level juga
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "Lo udah isi mood hari ini." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Gagal simpan mood" }, { status: 500 });
  }

  await appDb.from("xp_transactions").insert({
    user_id: user.id,
    source_type: "mood",
    source_id: mood.id,
    xp_amount: xpResult.baseXP,
    multiplier: xpResult.multiplier,
    final_xp: xpEarned,
  });

  await appDb.from("garden_items").insert({
    user_id: user.id,
    source_type: "mood",
    source_id: mood.id,
    item_type: getGardenItemTypeForMood(rating),
    mood_rating: rating,
    earned_date: today,
    metadata_json: {
      note_added: Boolean(note?.trim()),
    },
  });

  return NextResponse.json({
    mood,
    message: responseData?.message ?? "Mood lo tercatat!",
    streakDay,
    xpEarned,
    multiplier: xpResult.multiplier,
  });
}

export async function GET(req: NextRequest) {
  const { supabase, user, error: authError } = await getAuthenticatedUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getTodayDateString();

  // Cek apakah hari ini sudah isi
  const { data: todayMood } = await supabase
    .from("moods")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  // Ambil 7 hari terakhir untuk chart
  const { data: history } = await supabase
    .from("moods")
    .select("date, rating, streak_day, xp_earned")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(7);

  const appDb = createServiceRoleClient();
  const progress = await getUserProgress(appDb, user.id);

  return NextResponse.json({
    todayMood,
    history: history ?? [],
    totalXP: progress.totalXP,
    currentStreak: progress.currentStreak,
    streakMultiplier: progress.streakMultiplier,
    level: progress.level,
  });
}
