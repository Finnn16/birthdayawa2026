import { NextRequest, NextResponse } from "next/server";
import { normalizeCampaignPayload, normalizeMessagePayload } from "@/lib/admin-notifications";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

export async function GET() {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const { data: campaigns, error: campaignError } = await db
      .from("notification_campaigns")
      .select("*, notification_messages(*), notification_delivery_logs(id, status, created_at)")
      .order("created_at", { ascending: false });

    if (campaignError) {
      return NextResponse.json(
        { error: "Gagal memuat notification campaigns.", details: campaignError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ campaigns: campaigns ?? [] });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal memuat notification campaigns.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const payload = await req.json();
    const campaignPayload = {
      ...normalizeCampaignPayload(payload),
      created_by: user.id,
    };

    const { data: campaign, error: campaignError } = await db
      .from("notification_campaigns")
      .insert(campaignPayload)
      .select()
      .single();

    if (campaignError) {
      return NextResponse.json(
        { error: "Gagal membuat campaign.", details: campaignError.message },
        { status: 500 },
      );
    }

    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    if (messages.length) {
      const messageRows = messages.map((message: unknown) => ({
        ...normalizeMessagePayload(message as Record<string, unknown>),
        campaign_id: campaign.id,
      }));
      const { error: messageError } = await db.from("notification_messages").insert(messageRows);
      if (messageError) {
        return NextResponse.json(
          { error: "Campaign dibuat, tapi message gagal dibuat.", details: messageError.message },
          { status: 500 },
        );
      }
    }

    const { data: fullCampaign } = await db
      .from("notification_campaigns")
      .select("*, notification_messages(*), notification_delivery_logs(id, status, created_at)")
      .eq("id", campaign.id)
      .single();

    return NextResponse.json({ campaign: fullCampaign ?? campaign });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal membuat campaign.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
