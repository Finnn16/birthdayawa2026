import { NextResponse } from "next/server";
import { getDraftDuplicatePatch } from "@/lib/admin-publishing";
import type { ContentKind } from "@/lib/admin-publishing";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

type Params = {
  params: Promise<{ type: string; id: string }>;
};

type ContentConfig = {
  table: string;
  kind: ContentKind;
  select: string;
  responseKey: string;
};

const CONTENT_CONFIG: Record<string, ContentConfig> = {
  quests: {
    table: "daily_quest_bank",
    kind: "quests",
    select: "*",
    responseKey: "quest",
  },
  messages: {
    table: "hero_messages",
    kind: "messages",
    select: "*",
    responseKey: "heroMessage",
  },
  minigames: {
    table: "mini_games",
    kind: "minigames",
    select: "*",
    responseKey: "minigame",
  },
  rewards: {
    table: "rewards",
    kind: "rewards",
    select: "*",
    responseKey: "reward",
  },
};

function stripGeneratedFields(record: Record<string, unknown>) {
  const {
    id: _id,
    created_at: _createdAt,
    updated_at: _updatedAt,
    creator: _creator,
    ...rest
  } = record;

  return rest;
}

async function getCreatorId(db: ReturnType<typeof createServiceRoleClient>, userId: string) {
  const { data } = await db.from("users").select("id").eq("id", userId).maybeSingle();
  return data?.id ?? null;
}

async function getCopyTitle(
  db: ReturnType<typeof createServiceRoleClient>,
  table: string,
  originalTitle: unknown,
) {
  const baseTitle = typeof originalTitle === "string" && originalTitle.trim() ? originalTitle.trim() : "Untitled";

  for (let index = 1; index <= 50; index += 1) {
    const candidate = index === 1 ? `${baseTitle} (Copy)` : `${baseTitle} (Copy ${index})`;
    const { data, error } = await db.from(table).select("id").eq("title", candidate).maybeSingle();
    if (!data && !error) return candidate;
  }

  return `${baseTitle} (Copy ${Date.now()})`;
}

export async function POST(_req: Request, { params }: Params) {
  const { type, id } = await params;
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  const config = CONTENT_CONFIG[type];
  if (!config) {
    return NextResponse.json({ error: "Tipe konten tidak didukung untuk duplicate." }, { status: 400 });
  }

  try {
    const db = createServiceRoleClient();
    const { data: original, error: originalError } = await db
      .from(config.table)
      .select(config.select)
      .eq("id", id)
      .maybeSingle();

    if (originalError) {
      return NextResponse.json({ error: "Gagal mengambil konten asal.", details: originalError.message }, { status: 500 });
    }
    if (!original) {
      return NextResponse.json({ error: "Konten asal tidak ditemukan." }, { status: 404 });
    }

    const creatorId = await getCreatorId(db, user.id);

    const originalRecord = original as Record<string, any>;

    const title = await getCopyTitle(db, config.table, originalRecord.title);
    const insertPayload = {
      ...stripGeneratedFields(originalRecord),
      title,
      ...getDraftDuplicatePatch(config.kind),
      created_by: creatorId,
    };

    const { data, error: insertError } = await db
      .from(config.table)
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Gagal membuat duplikat konten.", details: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ [config.responseKey]: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal membuat duplikat konten.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
