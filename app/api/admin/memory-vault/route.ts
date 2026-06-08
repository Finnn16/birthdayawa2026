import { NextResponse } from "next/server";
import { getTargetUserId } from "@/lib/engagement";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

type MemoryEntry = {
  id: string;
  type: "event" | "milestone" | "mood" | "memory";
  title: string;
  description?: string;
  date: string;
  icon: string;
  color: string;
  sortDate: string;
  relatedData?: Record<string, unknown>;
};

function authResponse(error: "Unauthorized" | "Forbidden" | null) {
  if (error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });
  return null;
}

function normalizeDateString(value?: string | null) {
  return value?.slice(0, 10) ?? "";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${date}T00:00:00+07:00`));
}

function isMilestone(streakDay?: number | null) {
  if (!streakDay) return false;
  return [7, 14, 30, 50, 100].includes(streakDay) || streakDay % 100 === 0;
}

export async function GET() {
  const { user, error } = await requireAdmin();
  const unauthorized = authResponse(!user && error === "Unauthorized" ? error : error);
  if (unauthorized) return unauthorized;

  try {
    const db = createServiceRoleClient();
    const targetUserId = await getTargetUserId(db);

    const [events, moods, redemptions] = await Promise.all([
      db
        .from("couple_events")
        .select("id, title, description, event_date, event_type, is_special")
        .eq("is_active", true)
        .order("event_date", { ascending: false })
        .limit(80),
      targetUserId
        ? db
            .from("moods")
            .select("id, date, rating, note, streak_day")
            .eq("user_id", targetUserId)
            .order("date", { ascending: false })
            .limit(120)
        : Promise.resolve({ data: [] }),
      targetUserId
        ? db
            .from("reward_redemptions")
            .select("id, status, fulfilled_at, approved_at, requested_at, rewards(title, category)")
            .eq("user_id", targetUserId)
            .in("status", ["approved", "fulfilled"])
            .order("requested_at", { ascending: false })
            .limit(30)
        : Promise.resolve({ data: [] }),
    ]);

    if (events.error) {
      return NextResponse.json(
        {
          memories: [],
          error: "Gagal memuat memory vault.",
          details: events.error.message,
        },
        { status: 503 },
      );
    }

    const memoryEntries: MemoryEntry[] = [
      ...(events.data?.map((event: any) => {
        const date = normalizeDateString(event.event_date);
        return {
          id: `event-${event.id}`,
          type: "event" as const,
          title: event.title,
          description: event.description ?? undefined,
          date: formatDate(date),
          icon: event.is_special ? "Special" : "Event",
          color: event.is_special ? "bg-purple-500" : "bg-blue-400",
          sortDate: date,
          relatedData: {
            eventType: event.event_type,
          },
        };
      }) ?? []),
      ...((moods.data ?? []) as any[])
        .filter((mood) => mood.rating >= 9 || mood.rating <= 3 || mood.note || isMilestone(mood.streak_day))
        .flatMap((mood) => {
          const date = normalizeDateString(mood.date);
          const entries: MemoryEntry[] = [];

          if (mood.rating >= 9 || mood.rating <= 3 || mood.note) {
            entries.push({
              id: `mood-${mood.id}`,
              type: "mood",
              title: `Mood Rating ${mood.rating}/10`,
              description: mood.note ?? (mood.rating >= 9 ? "A bright mood day" : "A day that needed extra care"),
              date: formatDate(date),
              icon: mood.rating >= 9 ? "Bright" : "Care",
              color: mood.rating >= 9 ? "bg-yellow-400" : "bg-rose-400",
              sortDate: date,
              relatedData: {
                rating: mood.rating,
                streakDay: mood.streak_day,
              },
            });
          }

          if (isMilestone(mood.streak_day)) {
            entries.push({
              id: `milestone-streak-${mood.id}`,
              type: "milestone",
              title: `${mood.streak_day} Days Streak Achieved`,
              description: "Mood tracking streak milestone",
              date: formatDate(date),
              icon: "Milestone",
              color: "bg-emerald-500",
              sortDate: date,
              relatedData: {
                streakDay: mood.streak_day,
              },
            });
          }

          return entries;
        }),
      ...((redemptions.data ?? []) as any[]).map((redemption) => {
        const date = normalizeDateString(
          redemption.fulfilled_at ?? redemption.approved_at ?? redemption.requested_at,
        );
        return {
          id: `reward-${redemption.id}`,
          type: "memory" as const,
          title: `Reward ${redemption.status}: ${redemption.rewards?.title ?? "Reward"}`,
          description: "Reward memory",
          date: formatDate(date),
          icon: "Reward",
          color: "bg-fuchsia-400",
          sortDate: date,
          relatedData: {
            status: redemption.status,
            category: redemption.rewards?.category,
          },
        };
      }),
    ];

    const memories = memoryEntries
      .filter((memory) => memory.sortDate)
      .sort((a, b) => b.sortDate.localeCompare(a.sortDate))
      .slice(0, 120)
      .map(({ sortDate: _sortDate, ...memory }) => memory);

    return NextResponse.json({ memories, data: { memories } });
  } catch (error) {
    return NextResponse.json(
      {
        memories: [],
        error: "Gagal memuat memory vault.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
