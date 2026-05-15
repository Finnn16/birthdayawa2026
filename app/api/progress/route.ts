import { NextResponse } from "next/server";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";
import { getUserProgress } from "@/lib/progress";

export async function GET() {
  const { user, error } = await getAuthenticatedUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const progress = await getUserProgress(createServiceRoleClient(), user.id);
  return NextResponse.json(progress);
}
