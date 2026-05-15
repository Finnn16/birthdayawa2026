import { NextResponse } from "next/server";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = createServiceRoleClient();
    const { data, error: gardenError } = await db
      .from("garden_items")
      .select("*")
      .eq("user_id", user.id)
      .order("earned_date", { ascending: false })
      .limit(30);

    if (gardenError) {
      return NextResponse.json({ gardenItems: [], error: gardenError.message }, { status: 503 });
    }

    return NextResponse.json({ gardenItems: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memuat mood garden.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
