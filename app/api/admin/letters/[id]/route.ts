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

async function insertPages(
  db: ReturnType<typeof createServiceRoleClient>,
  letterId: string,
  pages: ReturnType<typeof normalizePages>,
) {
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") {
    return NextResponse.json({ error }, { status: 401 });
  }
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const payload = await req.json();
    const db = createServiceRoleClient();
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof payload.title === "string") {
      if (!payload.title.trim()) {
        return NextResponse.json(
          { error: "Judul surat wajib diisi." },
          { status: 400 },
        );
      }
      patch.title = payload.title.trim();
    }
    if ("subtitle" in payload) {
      patch.subtitle =
        typeof payload.subtitle === "string" && payload.subtitle.trim()
          ? payload.subtitle.trim()
          : null;
    }
    if (typeof payload.trigger_date === "string") {
      if (!payload.trigger_date) {
        return NextResponse.json(
          { error: "Tanggal trigger wajib diisi." },
          { status: 400 },
        );
      }
      patch.trigger_date = payload.trigger_date;
    }
    if ("audio_url" in payload) {
      patch.audio_url =
        typeof payload.audio_url === "string" && payload.audio_url.trim()
          ? payload.audio_url.trim()
          : null;
    }
    if (typeof payload.is_active === "boolean") {
      patch.is_active = payload.is_active;
    }
    if ("metadata_json" in payload) patch.metadata_json = payload.metadata_json ?? null;

    const { error: updateError } = await db
      .from("letters")
      .update(patch)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: "Gagal update surat.", details: updateError.message },
        { status: 500 },
      );
    }

    if ("pages" in payload) {
      const pages = normalizePages(payload.pages);
      if (pages.length === 0) {
        return NextResponse.json(
          { error: "Minimal satu page surat wajib dibuat." },
          { status: 400 },
        );
      }

      const { error: deletePagesError } = await db
        .from("letter_pages")
        .delete()
        .eq("letter_id", id);

      if (deletePagesError) {
        return NextResponse.json(
          {
            error: "Gagal mengganti page surat.",
            details: deletePagesError.message,
          },
          { status: 500 },
        );
      }

      await insertPages(db, id, pages);
    }

    return NextResponse.json({ updated: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal update surat.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") {
    return NextResponse.json({ error }, { status: 401 });
  }
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const { data: existing, error: existingError } = await db
      .from("letters")
      .select("id, is_active")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: "Gagal cek surat.", details: existingError.message },
        { status: 500 },
      );
    }
    if (!existing) {
      return NextResponse.json(
        { error: "Surat tidak ditemukan." },
        { status: 404 },
      );
    }
    if (existing.is_active) {
      return NextResponse.json(
        { error: "Deactivate surat dulu sebelum dihapus." },
        { status: 400 },
      );
    }

    const { error: deleteError } = await db.from("letters").delete().eq("id", id);
    if (deleteError) {
      return NextResponse.json(
        { error: "Gagal menghapus surat.", details: deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal menghapus surat.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
