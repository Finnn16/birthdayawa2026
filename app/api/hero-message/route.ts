import { NextResponse } from "next/server";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";

const fallbackHeroMessage = {
  title: "Jaga mood, kumpulin Hearts, dan rawat garden pelan-pelan.",
  body: "Hari ini cukup isi mood dulu. Quest dan reward bisa menyusul setelahnya.",
  tone: "soft",
};

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = createServiceRoleClient();
    const today = new Date().toISOString().split("T")[0];
    const { data, error: heroError } = await db
      .from("hero_messages")
      .select("*")
      .eq("is_active", true)
      .or(`active_date.is.null,active_date.lte.${today}`)
      .order("active_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (heroError) {
      return NextResponse.json({ heroMessage: fallbackHeroMessage, error: heroError.message }, { status: 200 });
    }

    return NextResponse.json({ heroMessage: data ?? fallbackHeroMessage });
  } catch (error) {
    return NextResponse.json(
      {
        heroMessage: fallbackHeroMessage,
        error: "Gagal memuat hero message.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 },
    );
  }
}
