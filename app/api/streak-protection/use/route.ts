import { NextRequest, NextResponse } from "next/server";
import { getYesterdayDateString } from "@/lib/streak-protection";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = createServiceRoleClient();
    const payload = await req.json().catch(() => ({}));
    const itemType = payload.item_type === "streak_shield" ? "streak_shield" : "forgiveness_ticket";
    const protectedDate = typeof payload.protected_date === "string" ? payload.protected_date : getYesterdayDateString();

    const { data: item } = await db
      .from("user_inventory")
      .select("*")
      .eq("user_id", user.id)
      .eq("item_type", itemType)
      .maybeSingle();

    if (!item || item.quantity <= 0) {
      return NextResponse.json({ error: "Item streak protection tidak tersedia." }, { status: 400 });
    }

    const { data: existingMood } = await db
      .from("moods")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", protectedDate)
      .maybeSingle();

    if (existingMood) {
      return NextResponse.json({ error: "Tanggal ini sudah punya mood, tidak perlu protection." }, { status: 400 });
    }

    const { data: previousMood } = await db
      .from("moods")
      .select("streak_day")
      .eq("user_id", user.id)
      .lt("date", protectedDate)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: log, error: logError } = await db
      .from("streak_protection_logs")
      .insert({
        user_id: user.id,
        item_type: itemType,
        protected_date: protectedDate,
        reason: typeof payload.reason === "string" ? payload.reason.trim() : null,
        status: "pending",
        previous_streak_day: previousMood?.streak_day ?? 0,
      })
      .select()
      .single();

    if (logError) {
      if (logError.code === "23505") {
        return NextResponse.json({ error: "Tanggal ini sudah memakai streak protection." }, { status: 409 });
      }
      return NextResponse.json({ error: "Gagal memakai streak protection.", details: logError.message }, { status: 500 });
    }

    return NextResponse.json({ log, message: "Request streak protection dikirim. Tunggu approval admin." });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memakai streak protection.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
