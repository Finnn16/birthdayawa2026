import { NextRequest, NextResponse } from "next/server";
import {
  NotificationCampaign,
  NotificationMessage,
  getNotificationUsers,
  pickWeightedMessage,
  sendNotificationToUser,
  shouldRunCampaign,
  shouldSendToUser,
} from "@/lib/admin-notifications";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

function hasValidCronAuth(req: NextRequest) {
  const apiKey = process.env.NOTIFICATION_API_KEY;
  const authHeader = req.headers.get("authorization");
  return Boolean(apiKey && authHeader === `Bearer ${apiKey}`);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.user && !hasValidCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (admin.error === "Forbidden" && !hasValidCronAuth(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const db = createServiceRoleClient();
    const { data: campaigns, error: campaignError } = await db
      .from("notification_campaigns")
      .select("*, notification_messages(*)")
      .eq("is_active", true)
      .order("send_time", { ascending: true });

    if (campaignError) {
      return NextResponse.json(
        { error: "Gagal memuat due campaigns.", details: campaignError.message },
        { status: 500 },
      );
    }

    const users = await getNotificationUsers();
    const results = [];

    for (const rawCampaign of campaigns ?? []) {
      const campaign = rawCampaign as NotificationCampaign & { notification_messages?: NotificationMessage[] };
      if (!shouldRunCampaign(campaign)) continue;

      const message = pickWeightedMessage(campaign.notification_messages ?? []);
      if (!message) {
        results.push({ campaignId: campaign.id, campaignName: campaign.name, skipped: true, reason: "No active message" });
        continue;
      }

      let sent = 0;
      let failed = 0;
      let skipped = 0;

      for (const user of users) {
        if (!(await shouldSendToUser(campaign, user))) {
          skipped += 1;
          continue;
        }

        const result = await sendNotificationToUser({ campaign, message, user });
        if (result.ok) sent += 1;
        else failed += 1;
      }

      await db
        .from("notification_campaigns")
        .update({ last_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", campaign.id);

      results.push({ campaignId: campaign.id, campaignName: campaign.name, sent, failed, skipped });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal menjalankan due notification campaigns.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
