import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-supabase";
import { getUserProgress } from "@/lib/progress";

export async function GET() {
  const { supabase, user, error } = await getAuthenticatedUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const progress = await getUserProgress(supabase, user.id);
  return NextResponse.json(progress);
}
