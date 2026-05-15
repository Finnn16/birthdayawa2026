import { NextResponse } from "next/server";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = createServiceRoleClient();
    const { data, error: inventoryError } = await db
      .from("user_inventory")
      .select("*")
      .eq("user_id", user.id)
      .order("item_type", { ascending: true });

    if (inventoryError) {
      return NextResponse.json({ inventory: [], error: inventoryError.message }, { status: 503 });
    }

    return NextResponse.json({ inventory: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memuat inventory.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
