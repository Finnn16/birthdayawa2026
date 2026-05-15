import { NextRequest, NextResponse } from "next/server";
import { getTargetUserId, grantInventoryItem, STREAK_ITEM_TYPES } from "@/lib/engagement";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const payload = await req.json();
    const itemType = typeof payload.item_type === "string" && STREAK_ITEM_TYPES.includes(payload.item_type) ? payload.item_type : "forgiveness_ticket";
    const quantity = Math.max(1, Number(payload.quantity) || 1);
    const userId = typeof payload.user_id === "string" && payload.user_id ? payload.user_id : await getTargetUserId(db);
    if (!userId) return NextResponse.json({ error: "Target user tidak ditemukan." }, { status: 404 });
    const { data, error: grantError } = await grantInventoryItem(db, userId, itemType, quantity, "admin_grant");
    if (grantError) return NextResponse.json({ error: "Gagal grant inventory.", details: grantError.message }, { status: 500 });
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Gagal grant inventory.", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
