import { NextResponse } from "next/server";
import { getTargetUserEmail } from "@/lib/app-config";
import { getUserProgress } from "@/lib/progress";
import { requireAdmin } from "@/lib/server-supabase";

export async function GET() {
  const { supabase, user, error } = await requireAdmin();

  if (!user && error === "Unauthorized") {
    return NextResponse.json({ error }, { status: 401 });
  }

  if (error === "Forbidden") {
    return NextResponse.json({ error }, { status: 403 });
  }

  const targetEmail = getTargetUserEmail();

  // Ambil user_id target via RPC
  const { data: targetUserId, error: rpcError } = await supabase.rpc(
    "get_user_id_by_email",
    {
      target_email: targetEmail,
    },
  );

  if (rpcError || !targetUserId) {
    return NextResponse.json(
      {
        error: `Target user tidak ditemukan. Pastikan ${targetEmail} sudah daftar.`,
      },
      { status: 404 },
    );
  }

  // Ambil semua moods target user
  const { data: moods, error: moodsError } = await supabase
    .from("moods")
    .select("*")
    .eq("user_id", targetUserId)
    .order("date", { ascending: false });

  if (moodsError) {
    return NextResponse.json({ error: moodsError.message }, { status: 500 });
  }

  // Info user
  const { data: userInfo } = await supabase
    .from("users")
    .select("username, created_at")
    .eq("id", targetUserId)
    .single();

  const progress = await getUserProgress(supabase, targetUserId);

  // Hitung stats
  const ratings = moods?.map((m) => m.rating) ?? [];
  const avgRating = ratings.length
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) /
      10
    : 0;

  return NextResponse.json({
    moods: moods ?? [],
    stats: {
      totalDays: moods?.length ?? 0,
      avgRating,
      currentStreak: progress.currentStreak,
      totalXP: progress.totalXP,
      highestRating: ratings.length ? Math.max(...ratings) : 0,
      lowestRating: ratings.length ? Math.min(...ratings) : 0,
      level: progress.level,
      streakMultiplier: progress.streakMultiplier,
    },
    userInfo,
  });
}
