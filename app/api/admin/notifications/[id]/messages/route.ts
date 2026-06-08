import { NextRequest, NextResponse } from "next/server";
import { normalizeMessagePayload } from "@/lib/admin-notifications";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const payload = await req.json();
    const insert = {
      ...normalizeMessagePayload(payload),
      campaign_id: id,
    };

    const { data, error: insertError } = await db
      .from("notification_messages")
      .insert(insert)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Gagal menambah message.", details: insertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: data });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal menambah message.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
