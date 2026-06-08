import { NextRequest, NextResponse } from "next/server";
import {
  getNotificationUsers,
  normalizeCampaignPayload,
  normalizeMessagePayload,
} from "@/lib/admin-notifications";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

function unauthorizedResponse(error: "Unauthorized" | "Forbidden" | null) {
  if (error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });
  return null;
}

function getStatusCount(logs: Array<{ status?: string | null }>, status: string) {
  return logs.filter((log) => log.status === status).length;
}

export async function GET() {
  const { user, error } = await requireAdmin();
  const unauthorized = unauthorizedResponse(!user && error === "Unauthorized" ? error : error);
  if (unauthorized) return unauthorized;

  try {
    const db = createServiceRoleClient();
    const [
      campaignsResult,
      messagesResult,
      logsResult,
      usersResult,
    ] = await Promise.all([
      db.from("notification_campaigns").select("*").order("created_at", { ascending: false }),
      db.from("notification_messages").select("*").order("created_at", { ascending: false }),
      db
        .from("notification_delivery_logs")
        .select("*, users(username, email)")
        .order("created_at", { ascending: false })
        .limit(80),
      getNotificationUsers(db),
    ]);

    if (campaignsResult.error) {
      return NextResponse.json(
        { error: "Notification tables belum siap. Jalankan migration notification center.", details: campaignsResult.error.message },
        { status: 503 },
      );
    }

    const campaigns = campaignsResult.data ?? [];
    const messages = messagesResult.data ?? [];
    const logs = logsResult.data ?? [];
    const totalSent = getStatusCount(logs, "sent") + getStatusCount(logs, "delivered");
    const totalDelivered = getStatusCount(logs, "delivered");
    const totalFailed = getStatusCount(logs, "failed");
    const totalAttempts = logs.length;

    return NextResponse.json({
      campaigns: campaigns.map((campaign: { id: string }) => ({
        ...campaign,
        messages: messages.filter((message: { campaign_id: string }) => message.campaign_id === campaign.id),
        delivery_count: logs.filter((log: { campaign_id?: string | null }) => log.campaign_id === campaign.id).length,
      })),
      messages,
      logs,
      users: usersResult.data,
      analytics: {
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter((campaign: { is_active?: boolean }) => campaign.is_active).length,
        totalMessages: messages.length,
        totalSent,
        totalDelivered,
        totalFailed,
        successRate: totalAttempts ? Math.round(((totalSent + totalDelivered) / totalAttempts) * 100) : 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memuat notification center.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  const unauthorized = unauthorizedResponse(!user && error === "Unauthorized" ? error : error);
  if (unauthorized) return unauthorized;

  try {
    const db = createServiceRoleClient();
    const payload = await req.json();
    const normalized = normalizeCampaignPayload(payload);
    if ("error" in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const { data: creator } = await db.from("users").select("id").eq("id", user!.id).maybeSingle();
    const { data: campaign, error: insertError } = await db
      .from("notification_campaigns")
      .insert({
        ...normalized.data,
        created_by: creator?.id ?? null,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Gagal membuat campaign.", details: insertError.message }, { status: 500 });
    }

    let message = null;
    if (payload.message && typeof payload.message === "object") {
      const normalizedMessage = normalizeMessagePayload(payload.message as Record<string, unknown>);
      if (!("error" in normalizedMessage)) {
        const messageResult = await db
          .from("notification_messages")
          .insert({ ...normalizedMessage.data, campaign_id: campaign.id })
          .select()
          .single();
        message = messageResult.data;
      }
    }

    return NextResponse.json({ campaign: { ...campaign, messages: message ? [message] : [] } }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal membuat campaign.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
