import { NextRequest, NextResponse } from "next/server";
import { getTodayDateString } from "@/lib/date";
import { createServiceRoleClient } from "@/lib/server-supabase";

export const runtime = "nodejs";

type PublishTarget = {
  table: string;
  label: string;
  dateColumn?: string;
};

const TARGETS: PublishTarget[] = [
  { table: "daily_quest_bank", label: "quests" },
  { table: "hero_messages", label: "heroMessages", dateColumn: "active_date" },
  { table: "mini_games", label: "minigames", dateColumn: "active_date" },
  { table: "rewards", label: "rewards" },
];

function isAuthorized(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  return Boolean(process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`);
}

async function publishDueTarget(
  db: ReturnType<typeof createServiceRoleClient>,
  target: PublishTarget,
  now: string,
) {
  const { data: dueItems, error: listError } = await db
    .from(target.table)
    .select(target.dateColumn ? `id, publish_at, ${target.dateColumn}` : "id, publish_at")
    .eq("publish_status", "scheduled")
    .lte("publish_at", now);

  if (listError) {
    return { label: target.label, published: 0, error: listError.message };
  }

  let published = 0;
  for (const item of dueItems ?? []) {
    const dueItem = item as unknown as Record<string, string | null>;
    const patch: Record<string, unknown> = {
      is_active: true,
      publish_status: "published",
      published_at: now,
      archived_at: null,
      updated_at: now,
    };

    if (target.dateColumn && !dueItem[target.dateColumn]) {
      patch[target.dateColumn] = getTodayDateString(new Date(dueItem.publish_at ?? now));
    }

    if (target.table === "daily_quest_bank" && dueItem.id) {
      const activeDate = getTodayDateString(new Date(dueItem.publish_at ?? now));
      const { data: existingAssignment } = await db
        .from("daily_quest_assignments")
        .select("id")
        .eq("quest_id", dueItem.id)
        .eq("active_date", activeDate)
        .maybeSingle();

      if (!existingAssignment) {
        await db.from("daily_quest_assignments").insert({
          quest_id: dueItem.id,
          active_date: activeDate,
          is_active: true,
          assigned_by: null,
        });
      }
    }

    const { error: updateError } = await db.from(target.table).update(patch).eq("id", dueItem.id);
    if (!updateError) published += 1;
  }

  return { label: target.label, published };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = createServiceRoleClient();
    const now = new Date().toISOString();
    const results = await Promise.all(TARGETS.map((target) => publishDueTarget(db, target, now)));

    return NextResponse.json({
      success: true,
      timestamp: now,
      results,
      totalPublished: results.reduce((total, result) => total + result.published, 0),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal publish konten terjadwal.",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
