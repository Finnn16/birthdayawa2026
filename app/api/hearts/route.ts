import { NextResponse } from "next/server";
import { getHeartBalance } from "@/lib/engagement";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = createServiceRoleClient();
    const [balance, transactions] = await Promise.all([
      getHeartBalance(db, user.id),
      db
        .from("heart_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    return NextResponse.json({
      balance,
      transactions: transactions.data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memuat Hearts.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
