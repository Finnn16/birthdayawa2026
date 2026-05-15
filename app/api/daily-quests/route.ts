import { NextResponse } from "next/server";
import { getTodayDateString } from "@/lib/date";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = createServiceRoleClient();
    const today = getTodayDateString();
    const { data: assignments, error: assignmentsError } = await db
      .from("daily_quest_assignments")
      .select("*, daily_quest_bank(*)")
      .eq("is_active", true)
      .eq("active_date", today)
      .order("created_at", { ascending: true });

    if (assignmentsError) {
      return NextResponse.json({ assignments: [], completions: [], error: assignmentsError.message }, { status: 503 });
    }

    const ids = assignments?.map((assignment) => assignment.id) ?? [];
    const { data: completions } = ids.length
      ? await db
          .from("daily_quest_completions")
          .select("*")
          .eq("user_id", user.id)
          .in("assignment_id", ids)
      : { data: [] };

    return NextResponse.json({
      assignments: assignments ?? [],
      completions: completions ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memuat daily quest.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
