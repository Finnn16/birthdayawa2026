import { addDays, getTodayDateString } from "@/lib/date";

type SupabaseLike = {
  from: (table: string) => any;
};

export type MoodForHero = {
  id: string;
  user_id: string;
  date: string;
  rating: number;
  note?: string | null;
};

export type GeneratedHeroMessage = {
  title: string;
  summary: string;
  message: string;
  tone: string;
  generationSource: "ai" | "fallback";
  requiresReview: boolean;
  metadata: Record<string, unknown>;
  promptProfile?: AiHeroPromptProfile | null;
};

export type AiHeroPromptProfile = {
  id: string;
  name: string;
  system_instruction: string;
  user_prompt_template: string;
  language: string;
  style_guide?: string | null;
  forbidden_style?: string | null;
  max_sentences: number;
  is_active: boolean;
};

const SAFETY_KEYWORDS = [
  "bunuh diri",
  "mati",
  "menghilang",
  "menyerah hidup",
  "ingin hilang",
];

function getToneForRating(rating: number) {
  if (rating <= 3) return "supportive";
  if (rating <= 6) return "calm";
  if (rating <= 9) return "positive";
  return "celebration";
}

function hasSafetySignal(note?: string | null) {
  const normalized = note?.toLowerCase() ?? "";
  return SAFETY_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function fallbackByRating(rating: number) {
  if (rating <= 3) {
    return "Kemarin mungkin terasa berat. Tidak apa-apa berjalan pelan, yang penting kamu tetap ada di sini hari ini.";
  }
  if (rating <= 6) {
    return "Terima kasih sudah bertahan sampai hari ini. Semoga hari ini terasa sedikit lebih ringan dari kemarin.";
  }
  if (rating <= 9) {
    return "Senang melihat harimu berjalan cukup baik kemarin. Semoga energi baik itu tetap menemani hari ini.";
  }
  return "Kemarin kelihatannya menyenangkan sekali. Semoga hari ini juga punya bagian kecil yang bikin kamu tersenyum.";
}

function getDefaultPromptProfile(): AiHeroPromptProfile {
  return {
    id: "default-code-profile",
    name: "Default Romantic Morning",
    system_instruction:
      "Kamu menulis hero message personal untuk aplikasi mood tracker romantis. Tulis singkat, hangat, natural, dan aman. Balas hanya JSON valid dengan field title, summary, message, tone.",
    user_prompt_template: [
      "Buat Hero Message pendek maksimal {{max_sentences}} kalimat.",
      "",
      "Gunakan bahasa {{language}} yang hangat dan natural.",
      "Jangan terdengar seperti motivator.",
      "Jangan terlalu formal.",
      "Jangan terlalu berlebihan.",
      "",
      "Style guide:",
      "{{style_guide}}",
      "",
      "Hindari gaya:",
      "{{forbidden_style}}",
      "",
      "Berdasarkan:",
      "User: {{user_name}}",
      "Mood Date: {{mood_date}}",
      "Mood Rating: {{mood_rating}}",
      "Mood Note:",
      "{{mood_note}}",
      "",
      "Tone hint: {{tone_hint}}",
      "",
      "Output harus JSON valid dengan field: title, summary, message, tone.",
    ].join("\n"),
    language: "id-ID",
    style_guide: "Romantis lembut, personal, seperti pesan kecil pagi hari. Boleh memakai sapaan natural, tapi jangan berlebihan.",
    forbidden_style: "Ceramah motivasi, terlalu formal, terlalu dramatis, toxic positivity, janji berlebihan.",
    max_sentences: 2,
    is_active: true,
  };
}

function renderPromptTemplate(
  template: string,
  mood: MoodForHero,
  promptProfile: AiHeroPromptProfile,
  toneHint: string,
  userName = "Awa",
) {
  const noteContext = mood.note?.trim()
    ? mood.note.trim()
    : "Mood Note tidak tersedia. Gunakan rating mood sebagai konteks utama.";

  const values: Record<string, string> = {
    mood_rating: String(mood.rating),
    mood_note: noteContext,
    mood_date: mood.date,
    user_name: userName,
    tone_hint: toneHint,
    language: promptProfile.language || "id-ID",
    style_guide: promptProfile.style_guide ?? "",
    forbidden_style: promptProfile.forbidden_style ?? "",
    max_sentences: String(promptProfile.max_sentences || 2),
  };

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => values[key] ?? "");
}

export function buildHeroPrompt(params: {
  mood: MoodForHero;
  promptProfile: AiHeroPromptProfile;
  toneHint?: string;
  userName?: string;
}) {
  return renderPromptTemplate(
    params.promptProfile.user_prompt_template,
    params.mood,
    params.promptProfile,
    params.toneHint ?? getToneForRating(Number(params.mood.rating)),
    params.userName,
  );
}

async function getActivePromptProfile(db: SupabaseLike) {
  const { data, error } = await db
    .from("ai_hero_prompt_profiles")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error || !data) return getDefaultPromptProfile();
  return data as AiHeroPromptProfile;
}

function parseAiContent(content: string, fallbackTone: string): Omit<GeneratedHeroMessage, "generationSource" | "requiresReview" | "metadata"> {
  const trimmed = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
    if (!message) throw new Error("AI response missing message.");
    return {
      title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : "Untuk hari ini",
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
      message,
      tone: typeof parsed.tone === "string" && parsed.tone.trim() ? parsed.tone.trim() : fallbackTone,
    };
  } catch {
    return {
      title: "Untuk hari ini",
      summary: "",
      message: trimmed,
      tone: fallbackTone,
    };
  }
}

async function getFallbackFromTemplate(db: SupabaseLike, rating: number) {
  const { data } = await db
    .from("hero_message_templates")
    .select("title, message, tone")
    .eq("is_active", true)
    .lte("min_rating", rating)
    .gte("max_rating", rating)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as { title?: string | null; message?: string; tone?: string } | null;
}

type GeminiAttempt = {
  model: string;
  ok: boolean;
  error?: string;
};

function getGeminiModelChain() {
  const configuredModels =
    process.env.AI_HERO_GEMINI_MODELS ??
    process.env.AI_HERO_GEMINI_MODEL ??
    process.env.GEMINI_MODEL;

  const defaults = [
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
  ];

  const models = configuredModels
    ?.split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return Array.from(new Set([...(models?.length ? models : []), ...defaults]));
}

function isNonRetryableGeminiError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("api key not valid") ||
    normalized.includes("permission denied") ||
    normalized.includes("billing") ||
    normalized.includes("location is not supported")
  );
}

async function requestGeminiForModel(params: {
  mood: MoodForHero;
  promptProfile: AiHeroPromptProfile;
  model: string;
  apiKey: string;
  userName?: string;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.AI_HERO_TIMEOUT_MS ?? 12000));
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent`;
  const prompt = buildHeroPrompt({
    mood: params.mood,
    promptProfile: params.promptProfile,
    userName: params.userName,
  });

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": params.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: params.promptProfile.system_instruction,
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 220,
          responseMimeType: "application/json",
        },
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof json.error?.message === "string" ? json.error.message : `Gemini request failed with status ${res.status}.`);
    }

    const content = json.candidates?.[0]?.content?.parts
      ?.map((part: { text?: unknown }) => (typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim();
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Gemini response is empty.");
    }

    return content;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateWithGemini(params: {
  mood: MoodForHero;
  promptProfile: AiHeroPromptProfile;
  userName?: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const attempts: GeminiAttempt[] = [];
  const models = getGeminiModelChain();

  for (const model of models) {
    try {
      const content = await requestGeminiForModel({
        mood: params.mood,
        promptProfile: params.promptProfile,
        model,
        apiKey,
        userName: params.userName,
      });
      attempts.push({ model, ok: true });
      return { content, model, attempts };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Gemini error";
      attempts.push({ model, ok: false, error: message });
      if (isNonRetryableGeminiError(message)) break;
    }
  }

  const failedAttempts = attempts.filter((attempt) => !attempt.ok);
  const lastError = failedAttempts[failedAttempts.length - 1]?.error ?? "All Gemini models failed.";
  const detail = attempts.map((attempt) => `${attempt.model}: ${attempt.ok ? "ok" : attempt.error}`).join(" | ");
  throw new Error(`${lastError} Attempts: ${detail}`);
}

export async function generateHeroMessageForMood(
  db: SupabaseLike,
  mood: MoodForHero,
  options: { promptProfile?: AiHeroPromptProfile | null; userName?: string } = {},
): Promise<GeneratedHeroMessage> {
  const tone = getToneForRating(Number(mood.rating));
  const safetyFlag = hasSafetySignal(mood.note);
  const promptProfile = options.promptProfile ?? (await getActivePromptProfile(db));

  if (safetyFlag) {
    return {
      title: "Aku di sini",
      summary: "Safety support fallback karena mood note perlu perhatian.",
      message: "Aku dengar kemarin terasa sangat berat. Kamu tidak harus menghadapi semuanya sendirian hari ini.",
      tone: "supportive",
      generationSource: "fallback",
      requiresReview: true,
      metadata: { safety_keywords_checked: true, ai_skipped: true, prompt_profile: promptProfile.name },
      promptProfile,
    };
  }

  try {
    const result = await generateWithGemini({
      mood,
      promptProfile,
      userName: options.userName,
    });
    return {
      ...parseAiContent(result.content, tone),
      generationSource: "ai",
      requiresReview: false,
      metadata: {
        provider: "gemini",
        model: result.model,
        attempts: result.attempts,
        prompt_profile_id: promptProfile.id,
        prompt_profile_name: promptProfile.name,
      },
      promptProfile,
    };
  } catch (error) {
    const template = await getFallbackFromTemplate(db, Number(mood.rating));
    return {
      title: template?.title ?? "Untuk hari ini",
      summary: "Generated from fallback template.",
      message: template?.message ?? fallbackByRating(Number(mood.rating)),
      tone: template?.tone ?? tone,
      generationSource: "fallback",
      requiresReview: false,
      metadata: {
        fallback_reason: error instanceof Error ? error.message : "Unknown AI error",
        prompt_profile_id: promptProfile.id,
        prompt_profile_name: promptProfile.name,
      },
      promptProfile,
    };
  }
}

type GenerateOptions = {
  force?: boolean;
};

export async function createAiHeroMessageForMood(
  db: SupabaseLike,
  mood: MoodForHero,
  activeDate: string,
  options: GenerateOptions = {},
) {
  const { data: existing, error: existingError } = await db
    .from("ai_hero_messages")
    .select("*")
    .eq("user_id", mood.user_id)
    .eq("active_date", activeDate)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing && !options.force) return { message: existing, skipped: true, refreshed: false };

  const generated = await generateHeroMessageForMood(db, mood);

  if (existing && options.force) {
    const { data, error } = await db
      .from("ai_hero_messages")
      .update({
        source_mood_id: mood.id,
        title: generated.title,
        summary: generated.summary,
        message: generated.message,
        tone: generated.tone,
        generation_source: generated.generationSource,
        is_active: true,
        requires_review: generated.requiresReview,
        prompt_profile_id: generated.promptProfile?.id === "default-code-profile" ? null : generated.promptProfile?.id ?? null,
        prompt_profile_name: generated.promptProfile?.name ?? null,
        metadata_json: generated.metadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return { message: data, skipped: false, refreshed: true };
  }

  const { data, error } = await db
    .from("ai_hero_messages")
    .insert({
      user_id: mood.user_id,
      source_mood_id: mood.id,
      title: generated.title,
      summary: generated.summary,
      message: generated.message,
      tone: generated.tone,
      generation_source: generated.generationSource,
      active_date: activeDate,
      is_active: true,
      requires_review: generated.requiresReview,
      prompt_profile_id: generated.promptProfile?.id === "default-code-profile" ? null : generated.promptProfile?.id ?? null,
      prompt_profile_name: generated.promptProfile?.name ?? null,
      metadata_json: generated.metadata,
    })
    .select()
    .single();

  if (error) throw error;
  return { message: data, skipped: false, refreshed: false };
}

export async function generateDailyAiHeroMessages(
  db: SupabaseLike,
  date = getTodayDateString(),
  options: GenerateOptions = {},
) {
  const sourceDate = addDays(date, -1);
  const { data: moods, error } = await db
    .from("moods")
    .select("id, user_id, date, rating, note")
    .eq("date", sourceDate)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const results = [];
  for (const mood of (moods ?? []) as MoodForHero[]) {
    const result = await createAiHeroMessageForMood(db, mood, date, options);
    results.push({ userId: mood.user_id, sourceMoodId: mood.id, ...result });
  }

  return {
    activeDate: date,
    sourceDate,
    processed: results.length,
    created: results.filter((result) => !result.skipped && !result.refreshed).length,
    refreshed: results.filter((result) => result.refreshed).length,
    skipped: results.filter((result) => result.skipped).length,
    results,
  };
}
