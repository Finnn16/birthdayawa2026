import { NextRequest, NextResponse } from "next/server";
import { generateDailyAiHeroMessages } from "@/lib/ai-hero-messages";
import { getTodayDateString } from "@/lib/date";
import { createServiceRoleClient } from "@/lib/server-supabase";

function isAuthorized(req: NextRequest) {
  const token = process.env.CRON_SECRET ?? process.env.NOTIFICATION_API_KEY;
  const authHeader = req.headers.get("authorization");
  return Boolean(token && authHeader === `Bearer ${token}`);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const activeDate = typeof payload.active_date === "string" && payload.active_date ? payload.active_date : getTodayDateString();
    const db = createServiceRoleClient();
    const result = await generateDailyAiHeroMessages(db, activeDate);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal generate AI hero messages.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
