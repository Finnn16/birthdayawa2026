import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

function normalizePromptProfile(payload: Record<string, unknown>) {
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const systemInstruction =
    typeof payload.system_instruction === "string" ? payload.system_instruction.trim() : "";
  const userPromptTemplate =
    typeof payload.user_prompt_template === "string" ? payload.user_prompt_template.trim() : "";

  if (!name) throw new Error("Profile name wajib diisi.");
  if (!systemInstruction) throw new Error("System instruction wajib diisi.");
  if (!userPromptTemplate) throw new Error("User prompt template wajib diisi.");

  return {
    name,
    system_instruction: systemInstruction,
    user_prompt_template: userPromptTemplate,
    language: typeof payload.language === "string" && payload.language.trim() ? payload.language.trim() : "id-ID",
    style_guide: typeof payload.style_guide === "string" ? payload.style_guide.trim() : null,
    forbidden_style: typeof payload.forbidden_style === "string" ? payload.forbidden_style.trim() : null,
    max_sentences:
      typeof payload.max_sentences === "number" && payload.max_sentences > 0
        ? Math.min(5, Math.floor(payload.max_sentences))
        : 2,
    is_active: payload.is_active === true,
    updated_at: new Date().toISOString(),
  };
}

export async function GET() {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const { data, error: listError } = await db
      .from("ai_hero_prompt_profiles")
      .select("*")
      .order("is_active", { ascending: false })
      .order("updated_at", { ascending: false });

    if (listError) {
      return NextResponse.json(
        { error: "Gagal memuat prompt profiles.", details: listError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ profiles: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal memuat prompt profiles.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const payload = await req.json();
    const insert = normalizePromptProfile(payload);

    if (insert.is_active) {
      await db.from("ai_hero_prompt_profiles").update({ is_active: false }).eq("is_active", true);
    }

    const { data, error: insertError } = await db
      .from("ai_hero_prompt_profiles")
      .insert(insert)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Gagal membuat prompt profile.", details: insertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal membuat prompt profile.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
