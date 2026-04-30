import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const ADMIN_EMAIL = "harfintaufiq@gmail.com";
const TARGET_EMAIL = "awliyanajwa255@gmail.com";

export async function GET(req: NextRequest) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    },
  );

  // Cek auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cek apakah admin
  if (user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Ambil user_id target via RPC
  const { data: targetUserId, error: rpcError } = await supabase.rpc(
    "get_user_id_by_email",
    {
      target_email: TARGET_EMAIL,
    },
  );

  if (rpcError || !targetUserId) {
    return NextResponse.json(
      {
        error: `Target user tidak ditemukan. Pastikan ${TARGET_EMAIL} sudah daftar.`,
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
      currentStreak: moods?.[0]?.streak_day ?? 0,
      totalXP: moods?.reduce((sum, m) => sum + m.xp_earned, 0) ?? 0,
      highestRating: ratings.length ? Math.max(...ratings) : 0,
      lowestRating: ratings.length ? Math.min(...ratings) : 0,
    },
    userInfo,
  });
}
