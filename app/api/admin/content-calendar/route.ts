import { NextRequest, NextResponse } from "next/server";
import { toJakartaMidnight } from "@/lib/date";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

type CalendarType = "quest" | "message" | "minigame" | "event";

type CalendarItem = {
  id: string;
  contentId: string;
  type: CalendarType;
  title: string;
  date: string;
  status: string;
  category?: string | null;
  description?: string | null;
  endpoint?: string;
};

function dateOnly(value?: string | null) {
  if (!value) return null;
  return value.slice(0, 10);
}

function statusFrom(value?: { publish_status?: string | null; is_active?: boolean | null }) {
  if (value?.publish_status) return value.publish_status;
  return value?.is_active ? "published" : "draft";
}

function sortItems(items: CalendarItem[]) {
  return items.sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
}

export async function GET() {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const [
      questAssignments,
      heroMessages,
      minigames,
      events,
    ] = await Promise.all([
      db
        .from("daily_quest_assignments")
        .select("id, quest_id, active_date, is_active, daily_quest_bank(id, title, type, description, is_active, publish_status)")
        .order("active_date", { ascending: true })
        .limit(160),
      db
        .from("hero_messages")
        .select("id, title, body, tone, active_date, publish_status, publish_at, is_active")
        .order("active_date", { ascending: true, nullsFirst: false })
        .limit(160),
      db
        .from("mini_games")
        .select("id, title, description, type, active_date, publish_status, publish_at, is_active")
        .order("active_date", { ascending: true, nullsFirst: false })
        .limit(160),
      db
        .from("couple_events")
        .select("id, title, description, event_date, event_type, is_active")
        .order("event_date", { ascending: true })
        .limit(160),
    ]);

    const firstError =
      questAssignments.error ||
      heroMessages.error ||
      minigames.error ||
      events.error;
    if (firstError) {
      return NextResponse.json({ items: [], error: firstError.message }, { status: 503 });
    }

    const items: CalendarItem[] = [];

    for (const assignment of questAssignments.data ?? []) {
      const quest = Array.isArray(assignment.daily_quest_bank)
        ? assignment.daily_quest_bank[0]
        : assignment.daily_quest_bank;
      if (!quest) continue;
      items.push({
        id: assignment.id,
        contentId: assignment.quest_id,
        type: "quest",
        title: quest.title,
        date: assignment.active_date,
        status: assignment.is_active ? statusFrom(quest) : "draft",
        category: quest.type,
        description: quest.description,
        endpoint: `/api/admin/daily-quest-assignments/${assignment.id}`,
      });
    }

    for (const item of heroMessages.data ?? []) {
      const date = dateOnly(item.publish_status === "scheduled" ? item.publish_at : item.active_date);
      if (!date) continue;
      items.push({
        id: item.id,
        contentId: item.id,
        type: "message",
        title: item.title,
        date,
        status: statusFrom(item),
        category: item.tone,
        description: item.body,
        endpoint: `/api/admin/hero-messages/${item.id}`,
      });
    }

    for (const item of minigames.data ?? []) {
      const date = dateOnly(item.publish_status === "scheduled" ? item.publish_at : item.active_date);
      if (!date) continue;
      items.push({
        id: item.id,
        contentId: item.id,
        type: "minigame",
        title: item.title,
        date,
        status: statusFrom(item),
        category: item.type,
        description: item.description,
        endpoint: `/api/admin/minigames/${item.id}`,
      });
    }

    for (const item of events.data ?? []) {
      items.push({
        id: item.id,
        contentId: item.id,
        type: "event",
        title: item.title,
        date: item.event_date,
        status: item.is_active ? "published" : "draft",
        category: item.event_type,
        description: item.description,
        endpoint: `/api/admin/couple-events/${item.id}`,
      });
    }

    return NextResponse.json({
      items: sortItems(items),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        items: [],
        error: "Gagal memuat content calendar.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const payload = await req.json();
    const type = payload.type as CalendarType;
    const id = typeof payload.id === "string" ? payload.id : "";
    const date = typeof payload.date === "string" ? payload.date : "";

    if (!id || !date) {
      return NextResponse.json({ error: "id dan date wajib diisi." }, { status: 400 });
    }

    const db = createServiceRoleClient();
    const scheduledAt = toJakartaMidnight(date).toISOString();
    let result;

    if (type === "quest") {
      result = await db
        .from("daily_quest_assignments")
        .update({ active_date: date })
        .eq("id", id)
        .select()
        .single();
    } else if (type === "message") {
      result = await db
        .from("hero_messages")
        .update({ active_date: date, publish_at: scheduledAt, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
    } else if (type === "minigame") {
      result = await db
        .from("mini_games")
        .update({ active_date: date, publish_at: scheduledAt, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
    } else if (type === "event") {
      result = await db
        .from("couple_events")
        .update({ event_date: date, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
    } else {
      return NextResponse.json({ error: "Tipe konten kalender tidak didukung." }, { status: 400 });
    }

    if (result.error) {
      if (result.error.code === "23505") {
        return NextResponse.json({ error: "Tanggal tersebut sudah memiliki item yang konflik." }, { status: 409 });
      }
      return NextResponse.json({ error: "Gagal memindahkan item kalender.", details: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ item: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal memindahkan item kalender.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
