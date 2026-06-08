import { NextRequest, NextResponse } from "next/server";
import { normalizeMessagePayload } from "@/lib/admin-notifications";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

type Params = { params: Promise<{ id: string }> };

function unauthorizedResponse(error: "Unauthorized" | "Forbidden" | null) {
  if (error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });
  return null;
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { user, error } = await requireAdmin();
  const unauthorized = unauthorizedResponse(!user && error === "Unauthorized" ? error : error);
  if (unauthorized) return unauthorized;

  try {
    const payload = await req.json();
    const normalized = normalizeMessagePayload(payload);
    if ("error" in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const db = createServiceRoleClient();
    const { data, error: insertError } = await db
      .from("notification_messages")
      .insert({ ...normalized.data, campaign_id: id })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Gagal membuat message.", details: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ message: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal membuat message.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
