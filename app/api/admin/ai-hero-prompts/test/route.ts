import { NextRequest, NextResponse } from "next/server";
import {
  AiHeroPromptProfile,
  MoodForHero,
  buildHeroPrompt,
  generateHeroMessageForMood,
} from "@/lib/ai-hero-messages";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

function normalizeProfile(payload: Record<string, unknown>): AiHeroPromptProfile {
  return {
    id: typeof payload.id === "string" ? payload.id : "preview-profile",
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : "Preview Profile",
    system_instruction:
      typeof payload.system_instruction === "string" && payload.system_instruction.trim()
        ? payload.system_instruction.trim()
        : "Balas hanya JSON valid dengan field title, summary, message, tone.",
    user_prompt_template:
      typeof payload.user_prompt_template === "string" && payload.user_prompt_template.trim()
        ? payload.user_prompt_template.trim()
        : "Buat hero message untuk mood {{mood_rating}}. Note: {{mood_note}}",
    language: typeof payload.language === "string" && payload.language.trim() ? payload.language.trim() : "id-ID",
    style_guide: typeof payload.style_guide === "string" ? payload.style_guide : "",
    forbidden_style: typeof payload.forbidden_style === "string" ? payload.forbidden_style : "",
    max_sentences: typeof payload.max_sentences === "number" ? Math.max(1, Math.floor(payload.max_sentences)) : 2,
    is_active: false,
  };
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const payload = await req.json();
    const promptProfile = normalizeProfile((payload.profile ?? payload) as Record<string, unknown>);
    const moodPayload = (payload.mood ?? {}) as Record<string, unknown>;
    const mood: MoodForHero = {
      id: "preview-mood",
      user_id: user.id,
      date: typeof moodPayload.date === "string" ? moodPayload.date : new Date().toISOString().slice(0, 10),
      rating: typeof moodPayload.rating === "number" ? moodPayload.rating : 5,
      note: typeof moodPayload.note === "string" ? moodPayload.note : "Hari ini capek, tapi masih berusaha pelan-pelan.",
    };
    const userName = typeof payload.user_name === "string" ? payload.user_name : "Awa";
    const renderedPrompt = buildHeroPrompt({ mood, promptProfile, userName });
    const db = createServiceRoleClient();
    const generated = await generateHeroMessageForMood(db, mood, { promptProfile, userName });

    return NextResponse.json({
      renderedPrompt,
      generated: {
        title: generated.title,
        summary: generated.summary,
        message: generated.message,
        tone: generated.tone,
        generationSource: generated.generationSource,
        requiresReview: generated.requiresReview,
        metadata: generated.metadata,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal test prompt.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
