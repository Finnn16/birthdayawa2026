import { NextRequest, NextResponse } from "next/server";
import { normalizeCampaignPayload } from "@/lib/admin-notifications";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

type Params = { params: Promise<{ id: string }> };

function unauthorizedResponse(error: "Unauthorized" | "Forbidden" | null) {
  if (error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });
  return null;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { user, error } = await requireAdmin();
  const unauthorized = unauthorizedResponse(!user && error === "Unauthorized" ? error : error);
  if (unauthorized) return unauthorized;

  try {
    const payload = await req.json();
    const normalized = normalizeCampaignPayload(payload);
    if ("error" in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const db = createServiceRoleClient();
    const { data, error: updateError } = await db
      .from("notification_campaigns")
      .update(normalized.data)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: "Gagal update campaign.", details: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ campaign: data });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal update campaign.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { user, error } = await requireAdmin();
  const unauthorized = unauthorizedResponse(!user && error === "Unauthorized" ? error : error);
  if (unauthorized) return unauthorized;

  try {
    const db = createServiceRoleClient();
    const { error: deleteError } = await db.from("notification_campaigns").delete().eq("id", id);
    if (deleteError) {
      return NextResponse.json({ error: "Gagal menghapus campaign.", details: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal menghapus campaign.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
