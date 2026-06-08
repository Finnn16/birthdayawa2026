import { NextResponse } from "next/server";
import { getTodayDateString } from "@/lib/date";
import {
  isLetterUnlocked,
  letterAudio,
  letterPages,
} from "@/lib/letter/letterContent";
import { getAuthenticatedUser } from "@/lib/server-supabase";

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isLetterUnlocked(getTodayDateString())) {
    return NextResponse.json({ letter: null });
  }

  return NextResponse.json({
    letter: {
      title: "Static Letter",
      pages: letterPages,
      audio: letterAudio,
    },
  });
}
