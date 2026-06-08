import { NextRequest, NextResponse } from "next/server";
import {
  getNotificationUsers,
  pickWeightedMessage,
  sendNotificationToUser,
  shouldSendToUser,
} from "@/lib/admin-notifications";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

type Campaign = {
  id: string;
  name: string;
  trigger_type: string;
  send_time: string;
  start_date?: string | null;
  end_date?: string | null;
  timezone?: string | null;
  metadata_json?: Record<string, unknown> | null;
};

function unauthorizedResponse(error: "Unauthorized" | "Forbidden" | null) {
  if (error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });
  return null;
}

function currentJakartaHHMM() {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  const unauthorized = unauthorizedResponse(!user && error === "Unauthorized" ? error : error);
  if (unauthorized) return unauthorized;

  try {
    const payload = await req.json().catch(() => ({}));
    const force = payload.force === true;
    const db = createServiceRoleClient();
    const nowTime = currentJakartaHHMM();

    const { data: campaigns, error: campaignError } = await db
      .from("notification_campaigns")
      .select("*")
      .eq("is_active", true)
      .eq("publish_status", "published");

    if (campaignError) {
      return NextResponse.json({ error: "Gagal memuat campaign.", details: campaignError.message }, { status: 500 });
    }

    const dueCampaigns = (campaigns ?? []).filter((campaign: Campaign) => {
      if (campaign.trigger_type === "manual_send") return false;
      if (force) return true;
      return campaign.send_time?.slice(0, 5) === nowTime;
    });

    const usersResult = await getNotificationUsers(db);
    const results = [];

    for (const campaign of dueCampaigns) {
      const { data: messages } = await db
        .from("notification_messages")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("is_active", true);
      const message = pickWeightedMessage(messages ?? []);
      if (!message) {
        results.push({ campaignId: campaign.id, campaignName: campaign.name, sent: 0, failed: 0, skipped: "no_active_message" });
        continue;
      }

      let sent = 0;
      let failed = 0;
      for (const target of usersResult.data) {
        const allowed = await shouldSendToUser(db, campaign, target);
        if (!allowed) continue;
        const result = await sendNotificationToUser(db, target, message.title, message.body, campaign.id);
        if (result.status === "sent") sent += 1;
        if (result.status === "failed") failed += 1;
      }

      if (sent + failed > 0) {
        await db.from("notification_campaigns").update({ last_sent_at: new Date().toISOString() }).eq("id", campaign.id);
      }
      results.push({ campaignId: campaign.id, campaignName: campaign.name, sent, failed });
    }

    return NextResponse.json({
      processedCampaigns: dueCampaigns.length,
      currentTime: nowTime,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal menjalankan due notification campaigns.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
