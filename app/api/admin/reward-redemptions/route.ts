import { NextResponse } from "next/server";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

export async function GET() {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const { data, error: listError } = await db
      .from("reward_redemptions")
      .select("*, rewards(title, category, metadata_json), users(username, email)")
      .order("requested_at", { ascending: false })
      .limit(80);

    if (listError) return NextResponse.json({ redemptions: [], error: listError.message }, { status: 503 });
    return NextResponse.json({ redemptions: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: "Gagal memuat redemptions.", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
