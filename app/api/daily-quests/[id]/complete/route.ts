import { NextRequest, NextResponse } from "next/server";
import { getGardenItemTypeForQuest, isAnswerCorrect } from "@/lib/engagement";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = createServiceRoleClient();
    const payload = await req.json().catch(() => ({}));
    const { data: assignment, error: assignmentError } = await db
      .from("daily_quest_assignments")
      .select("*, daily_quest_bank(*)")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (assignmentError) {
      return NextResponse.json({ error: assignmentError.message }, { status: 503 });
    }

    if (!assignment?.daily_quest_bank) {
      return NextResponse.json({ error: "Quest tidak ditemukan." }, { status: 404 });
    }

    const quest = assignment.daily_quest_bank;
    const isCorrect = isAnswerCorrect(payload.answer, quest.correct_answer);
    const xpEarned = isCorrect ? quest.xp_reward : 0;
    const heartsEarned = isCorrect ? quest.hearts_reward : 0;

    const { data: completion, error: completionError } = await db
      .from("daily_quest_completions")
      .insert({
        assignment_id: assignment.id,
        quest_id: quest.id,
        user_id: user.id,
        active_date: assignment.active_date,
        answer: typeof payload.answer === "string" ? payload.answer.trim() : null,
        is_correct: isCorrect,
        xp_earned: xpEarned,
        hearts_earned: heartsEarned,
        metadata_json: { quest_type: quest.type },
      })
      .select()
      .single();

    if (completionError) {
      if (completionError.code === "23505") {
        return NextResponse.json({ error: "Quest ini sudah selesai hari ini." }, { status: 409 });
      }
      return NextResponse.json({ error: "Gagal menyimpan quest.", details: completionError.message }, { status: 500 });
    }

    if (xpEarned > 0) {
      await db.from("xp_transactions").insert({
        user_id: user.id,
        source_type: "daily_quest",
        source_id: completion.id,
        xp_amount: xpEarned,
        multiplier: 1,
        final_xp: xpEarned,
      });
    }

    if (heartsEarned > 0) {
      await db.from("heart_transactions").insert({
        user_id: user.id,
        source_type: "daily_quest",
        source_id: completion.id,
        amount: heartsEarned,
        note: `Daily quest: ${quest.title}`,
      });
    }

    await db.from("garden_items").insert({
      user_id: user.id,
      source_type: "daily_quest",
      source_id: completion.id,
      item_type: getGardenItemTypeForQuest(quest.difficulty),
      earned_date: assignment.active_date,
      metadata_json: { quest_title: quest.title },
    });

    return NextResponse.json({ completion, xpEarned, heartsEarned, isCorrect });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal menyelesaikan quest.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
