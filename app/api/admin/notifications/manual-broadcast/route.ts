import { NextRequest, NextResponse } from "next/server";
import {
  getNotificationUsers,
  sendNotificationToUser,
} from "@/lib/admin-notifications";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

type NotificationUser = {
  id: string;
  username?: string | null;
  email?: string | null;
  phone_number?: string | null;
};

function unauthorizedResponse(error: "Unauthorized" | "Forbidden" | null) {
  if (error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });
  return null;
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  const unauthorized = unauthorizedResponse(!user && error === "Unauthorized" ? error : error);
  if (unauthorized) return unauthorized;

  try {
    const payload = await req.json();
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    const body = typeof payload.body === "string" ? payload.body.trim() : "";
    const targetUserId = typeof payload.target_user_id === "string" ? payload.target_user_id : "all";
    const campaignId = typeof payload.campaign_id === "string" && payload.campaign_id ? payload.campaign_id : null;

    if (!title) return NextResponse.json({ error: "Title wajib diisi." }, { status: 400 });
    if (!body) return NextResponse.json({ error: "Message wajib diisi." }, { status: 400 });

    const db = createServiceRoleClient();
    const usersResult = await getNotificationUsers(db);
    const users: NotificationUser[] =
      targetUserId === "all"
        ? usersResult.data
        : usersResult.data.filter((item: NotificationUser) => item.id === targetUserId);

    if (!users.length) {
      return NextResponse.json({ error: "Target user tidak ditemukan." }, { status: 404 });
    }

    const results = await Promise.all(
      users.map((target) => sendNotificationToUser(db, target, title, body, campaignId)),
    );

    return NextResponse.json({
      sent: results.filter((item) => item.status === "sent").length,
      failed: results.filter((item) => item.status === "failed").length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal mengirim manual broadcast.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
