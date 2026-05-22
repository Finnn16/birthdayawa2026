import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

type LetterSectionInput = {
  title?: unknown;
  body?: unknown;
};

type LetterPageInput = {
  headline?: unknown;
  subtitle?: unknown;
  image_url?: unknown;
  image_position?: unknown;
  sections?: unknown;
};

function normalizePages(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("Pages harus berupa array JSON.");
  }

  return value.map((page: LetterPageInput, pageIndex) => {
    const headline =
      typeof page.headline === "string" ? page.headline.trim() : "";
    if (!headline) {
      throw new Error(`Headline page ${pageIndex + 1} wajib diisi.`);
    }

    const sectionsValue = Array.isArray(page.sections) ? page.sections : [];
    const sections = sectionsValue.map(
      (section: LetterSectionInput, sectionIndex) => {
        const body =
          typeof section.body === "string" ? section.body.trim() : "";
        if (!body) {
          throw new Error(
            `Body section ${sectionIndex + 1} di page ${pageIndex + 1} wajib diisi.`,
          );
        }

        return {
          section_number: sectionIndex + 1,
          title:
            typeof section.title === "string" && section.title.trim()
              ? section.title.trim()
              : null,
          body,
        };
      },
    );

    return {
      page_number: pageIndex + 1,
      headline,
      subtitle:
        typeof page.subtitle === "string" && page.subtitle.trim()
          ? page.subtitle.trim()
          : null,
      image_url:
        typeof page.image_url === "string" && page.image_url.trim()
          ? page.image_url.trim()
          : null,
      image_position:
        typeof page.image_position === "string" && page.image_position.trim()
          ? page.image_position.trim()
          : "left",
      sections,
    };
  });
}

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

async function insertPages(db: ReturnType<typeof createServiceRoleClient>, letterId: string, pages: ReturnType<typeof normalizePages>) {
  for (const page of pages) {
    const { sections, ...pagePayload } = page;
    const { data: createdPage, error: pageError } = await db
      .from("letter_pages")
      .insert({ ...pagePayload, letter_id: letterId })
      .select("id")
      .single();

    if (pageError || !createdPage) {
      throw new Error(pageError?.message ?? "Gagal membuat page surat.");
    }

    if (sections.length > 0) {
      const { error: sectionError } = await db.from("letter_sections").insert(
        sections.map((section) => ({
          ...section,
          page_id: createdPage.id,
        })),
      );

      if (sectionError) {
        throw new Error(sectionError.message);
      }
    }
  }
}

export async function GET() {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") {
    return NextResponse.json({ error }, { status: 401 });
  }
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const { data, error: listError } = await db
      .from("letters")
      .select("*, letter_pages(*, letter_sections(*))")
      .order("trigger_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30);

    if (listError) {
      return NextResponse.json(
        { letters: [], error: listError.message },
        { status: 503 },
      );
    }

    return NextResponse.json({ letters: (data ?? []).map(sortLetter) });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal memuat surat.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") {
    return NextResponse.json({ error }, { status: 401 });
  }
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const payload = await req.json();
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    const triggerDate =
      typeof payload.trigger_date === "string" ? payload.trigger_date : "";
    if (!title) {
      return NextResponse.json({ error: "Judul surat wajib diisi." }, { status: 400 });
    }
    if (!triggerDate) {
      return NextResponse.json({ error: "Tanggal trigger wajib diisi." }, { status: 400 });
    }

    const pages = normalizePages(payload.pages);
    if (pages.length === 0) {
      return NextResponse.json({ error: "Minimal satu page surat wajib dibuat." }, { status: 400 });
    }

    const db = createServiceRoleClient();
    const { data: creator } = await db
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    const { data: letter, error: insertError } = await db
      .from("letters")
      .insert({
        title,
        subtitle:
          typeof payload.subtitle === "string" && payload.subtitle.trim()
            ? payload.subtitle.trim()
            : null,
        trigger_date: triggerDate,
        audio_url:
          typeof payload.audio_url === "string" && payload.audio_url.trim()
            ? payload.audio_url.trim()
            : null,
        is_active: payload.is_active !== false,
        metadata_json: payload.metadata_json ?? null,
        created_by: creator?.id ?? null,
      })
      .select("id")
      .single();

    if (insertError || !letter) {
      return NextResponse.json(
        { error: "Gagal membuat surat.", details: insertError?.message },
        { status: 500 },
      );
    }

    try {
      await insertPages(db, letter.id, pages);
    } catch (pageError) {
      await db.from("letters").delete().eq("id", letter.id);
      throw pageError;
    }

    return NextResponse.json({ letter: { id: letter.id } }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal membuat surat.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
