import { NextResponse } from "next/server";
import { getTodayDateString } from "@/lib/date";
import {
  createServiceRoleClient,
  getAuthenticatedUser,
} from "@/lib/server-supabase";

function sortLetter(letter: any) {
  const pages = [...(letter.letter_pages ?? [])]
    .sort((a, b) => Number(a.page_number ?? 0) - Number(b.page_number ?? 0))
    .map((page) => ({
      ...page,
      letter_sections: [...(page.letter_sections ?? [])].sort(
        (a, b) => Number(a.section_number ?? 0) - Number(b.section_number ?? 0),
      ),
    }));

  return { ...letter, letter_pages: pages };
}

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = createServiceRoleClient();
    const today = getTodayDateString();
    const { data, error: letterError } = await db
      .from("letters")
      .select("*, letter_pages(*, letter_sections(*))")
      .eq("is_active", true)
      .lte("trigger_date", today)
      .order("trigger_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (letterError) {
      return NextResponse.json(
        { letter: null, error: letterError.message },
        { status: 200 },
      );
    }

    return NextResponse.json({ letter: data ? sortLetter(data) : null });
  } catch (error) {
    return NextResponse.json(
      {
        letter: null,
        error: "Gagal memuat surat.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 },
    );
  }
}
