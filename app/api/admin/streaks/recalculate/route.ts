import { NextRequest, NextResponse } from "next/server";
import { getTargetUserId } from "@/lib/engagement";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";
import { recalculateUserMoodStreaks } from "@/lib/streak-protection";

type RecalculateResult = {
  userId: string;
  moodCount: number;
  updatedCount: number;
  currentStreak: number;
};

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const payload = await req.json().catch(() => ({}));
    const db = createServiceRoleClient();
    const userIds = await getUserIds(db, payload);

    if (!userIds.length) {
      return NextResponse.json({ error: "Tidak ada user yang bisa direcalculate." }, { status: 404 });
    }

    const results: RecalculateResult[] = [];
    for (const userId of userIds) {
      const result = await recalculateUserMoodStreaks(db, userId);
      results.push({
        userId,
        moodCount: result.moodCount,
        updatedCount: result.updatedCount,
        currentStreak: result.currentStreak,
      });
    }

    const totalUpdated = results.reduce((sum, item) => sum + item.updatedCount, 0);
    return NextResponse.json({
      message: `Recalculate streak selesai. ${totalUpdated} mood row diperbarui.`,
      scope: payload.scope === "all" ? "all" : "target",
      totalUsers: results.length,
      totalUpdated,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal recalculate streak.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

async function getUserIds(db: ReturnType<typeof createServiceRoleClient>, payload: any): Promise<string[]> {
  if (typeof payload.user_id === "string" && payload.user_id.trim()) {
    return [payload.user_id.trim()];
  }

  if (payload.scope === "all") {
    const { data, error } = await db.from("users").select("id");
    if (error) throw new Error(error.message);
    return (data ?? []).map((item: { id: string }) => item.id);
  }

  const targetUserId = await getTargetUserId(db);
  return targetUserId ? [targetUserId] : [];
}
