import { NextRequest, NextResponse } from "next/server";
import {
  NotificationCampaign,
  NotificationMessage,
  getNotificationUsers,
  pickWeightedMessage,
  sendNotificationToUser,
} from "@/lib/admin-notifications";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const payload = await req.json();
    const campaignId = typeof payload.campaign_id === "string" ? payload.campaign_id : "";
    const targetUserIds = Array.isArray(payload.user_ids)
      ? new Set(payload.user_ids.filter((id: unknown): id is string => typeof id === "string"))
      : null;

    if (!campaignId) {
      return NextResponse.json({ error: "campaign_id wajib diisi." }, { status: 400 });
    }

    const { data: campaign, error: campaignError } = await db
      .from("notification_campaigns")
      .select("*, notification_messages(*)")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: "Campaign tidak ditemukan.", details: campaignError?.message },
        { status: 404 },
      );
    }

    const message = pickWeightedMessage((campaign.notification_messages ?? []) as NotificationMessage[]);
    if (!message) {
      return NextResponse.json({ error: "Campaign belum punya active message." }, { status: 400 });
    }

    const allUsers = await getNotificationUsers();
    const users = targetUserIds ? allUsers.filter((entry) => targetUserIds.has(entry.id)) : allUsers;
    const results = [];

    for (const entry of users) {
      const result = await sendNotificationToUser({
        campaign: campaign as NotificationCampaign,
        message,
        user: entry,
      });
      results.push({ userId: entry.id, username: entry.username, ...result });
    }

    await db
      .from("notification_campaigns")
      .update({ last_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", campaignId);

    return NextResponse.json({
      success: true,
      sent: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok).length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal mengirim broadcast.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
