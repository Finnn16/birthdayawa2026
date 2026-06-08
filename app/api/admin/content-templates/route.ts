import { NextRequest, NextResponse } from "next/server";
import { getPublishPatch } from "@/lib/admin-publishing";
import type { ContentKind } from "@/lib/admin-publishing";
import {
  CONTENT_TEMPLATES,
  getContentTemplate,
  type TemplateContentType,
} from "@/lib/admin-content-templates";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

const TABLE_BY_CONTENT_TYPE: Record<TemplateContentType, string> = {
  quest: "daily_quest_bank",
  message: "hero_messages",
  minigame: "mini_games",
};

const RESPONSE_KEY_BY_CONTENT_TYPE: Record<TemplateContentType, string> = {
  quest: "quest",
  message: "heroMessage",
  minigame: "minigame",
};

async function getCreatorId(db: ReturnType<typeof createServiceRoleClient>, userId: string) {
  const { data } = await db.from("users").select("id").eq("id", userId).maybeSingle();
  return data?.id ?? null;
}

async function getDraftTitle(
  db: ReturnType<typeof createServiceRoleClient>,
  table: string,
  title: unknown,
) {
  const baseTitle = typeof title === "string" && title.trim() ? title.trim() : "Untitled Template Draft";

  for (let index = 1; index <= 50; index += 1) {
    const candidate = index === 1 ? baseTitle : `${baseTitle} ${index}`;
    const { data, error } = await db.from(table).select("id").eq("title", candidate).maybeSingle();
    if (!data && !error) return candidate;
  }

  return `${baseTitle} ${Date.now()}`;
}

function mapContentTypeToStudioTab(contentType: TemplateContentType): ContentKind {
  if (contentType === "quest") return "quests";
  if (contentType === "message") return "messages";
  return "minigames";
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  const contentType = req.nextUrl.searchParams.get("content_type");
  const templates = contentType
    ? CONTENT_TEMPLATES.filter((template) => template.contentType === contentType)
    : CONTENT_TEMPLATES;

  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const payload = await req.json();
    const template = typeof payload.template_id === "string" ? getContentTemplate(payload.template_id) : null;
    if (!template) {
      return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });
    }

    const db = createServiceRoleClient();
    const table = TABLE_BY_CONTENT_TYPE[template.contentType];
    const creatorId = await getCreatorId(db, user.id);
    const title = await getDraftTitle(db, table, template.payload.title);
    const now = new Date().toISOString();
    const insertPayload = {
      ...template.payload,
      title,
      ...getPublishPatch("draft", null, mapContentTypeToStudioTab(template.contentType)),
      metadata_json: {
        template_id: template.id,
        template_category: template.category,
        template_title: template.title,
      },
      created_by: creatorId,
      created_at: now,
      updated_at: now,
    };

    const { data, error: insertError } = await db
      .from(table)
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Gagal membuat draft dari template.", details: insertError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        [RESPONSE_KEY_BY_CONTENT_TYPE[template.contentType]]: data,
        contentType: template.contentType,
        studioTab: mapContentTypeToStudioTab(template.contentType),
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal membuat draft dari template.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
