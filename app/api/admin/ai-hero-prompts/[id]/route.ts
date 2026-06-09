import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

type Params = { params: Promise<{ id: string }> };

function normalizePromptProfile(payload: Record<string, unknown>) {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof payload.name === "string") update.name = payload.name.trim();
  if (typeof payload.system_instruction === "string") update.system_instruction = payload.system_instruction.trim();
  if (typeof payload.user_prompt_template === "string") update.user_prompt_template = payload.user_prompt_template.trim();
  if (typeof payload.language === "string") update.language = payload.language.trim() || "id-ID";
  if (typeof payload.style_guide === "string" || payload.style_guide === null) update.style_guide = payload.style_guide;
  if (typeof payload.forbidden_style === "string" || payload.forbidden_style === null) update.forbidden_style = payload.forbidden_style;
  if (typeof payload.max_sentences === "number") update.max_sentences = Math.min(5, Math.max(1, Math.floor(payload.max_sentences)));
  if (typeof payload.is_active === "boolean") update.is_active = payload.is_active;
  return update;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const payload = await req.json();
    const update = normalizePromptProfile(payload);

    if (update.is_active === true) {
      await db.from("ai_hero_prompt_profiles").update({ is_active: false }).neq("id", id);
    }

    const { data, error: updateError } = await db
      .from("ai_hero_prompt_profiles")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Gagal update prompt profile.", details: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal update prompt profile.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const { data: profile } = await db
      .from("ai_hero_prompt_profiles")
      .select("is_active")
      .eq("id", id)
      .maybeSingle();

    if (profile?.is_active) {
      return NextResponse.json({ error: "Prompt profile aktif tidak bisa dihapus." }, { status: 400 });
    }

    const { error: deleteError } = await db.from("ai_hero_prompt_profiles").delete().eq("id", id);
    if (deleteError) {
      return NextResponse.json(
        { error: "Gagal menghapus prompt profile.", details: deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal menghapus prompt profile.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
