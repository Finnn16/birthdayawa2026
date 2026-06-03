import { NextRequest, NextResponse } from "next/server";
import { addDays, getTodayDateString } from "@/lib/date";
import { getTargetUserId } from "@/lib/engagement";
import { getUserProgress } from "@/lib/progress";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

type MoodRow = {
  date: string;
  rating: number;
  note?: string | null;
  streak_day?: number | null;
  created_at?: string | null;
};

type ActivityRow = {
  completed_at?: string | null;
};

const RANGE_DAYS = {
  week: 7,
  month: 30,
  year: 365,
} as const;

function authResponse(error: "Unauthorized" | "Forbidden" | null) {
  if (error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });
  return null;
}

function emptyAnalytics() {
  return {
    moodMetrics: {
      weeklyAverage: 0,
      trend: 0,
      highestDay: "N/A",
      lowestDay: "N/A",
    },
    activityMetrics: {
      currentStreak: 0,
      longestStreak: 0,
      mostActiveHour: "N/A",
      totalXpEarned: 0,
    },
    engagementScore: {
      overall: 0,
      moodConsistency: 0,
      questCompletion: 0,
      dailyActivity: 0,
    },
    moodHistory: [],
  };
}

function normalizeDateString(value?: string | null) {
  return value?.slice(0, 10) ?? "";
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

function percent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatMoodDay(mood?: MoodRow) {
  if (!mood) return "N/A";
  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${normalizeDateString(mood.date)}T00:00:00+07:00`));
  return `${date} (${mood.rating}/10)`;
}

function activityDate(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function mostActiveHour(rows: Array<{ created_at?: string | null; completed_at?: string | null }>) {
  const counts = new Map<number, number>();
  rows.forEach((row) => {
    const value = row.created_at ?? row.completed_at;
    if (!value) return;
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        hour12: false,
      }).format(new Date(value)),
    );
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  });

  const [hour] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (hour === undefined) return "N/A";
  return `${String(hour).padStart(2, "0")}:00`;
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAdmin();
  const unauthorized = authResponse(!user && error === "Unauthorized" ? error : error);
  if (unauthorized) return unauthorized;

  try {
    const db = createServiceRoleClient();
    const rangeParam = req.nextUrl.searchParams.get("range") ?? "week";
    const days = RANGE_DAYS[rangeParam as keyof typeof RANGE_DAYS] ?? RANGE_DAYS.week;
    const today = getTodayDateString();
    const startDate = addDays(today, -(days - 1));
    const previousStartDate = addDays(startDate, -days);
    const previousEndDate = addDays(startDate, -1);
    const targetUserId = await getTargetUserId(db);

    if (!targetUserId) {
      return NextResponse.json({ data: emptyAnalytics() });
    }

    const [
      moodsResult,
      previousMoodsResult,
      progress,
      questAssignments,
      questCompletions,
      minigameCompletions,
    ] = await Promise.all([
      db
        .from("moods")
        .select("date, rating, note, streak_day, created_at")
        .eq("user_id", targetUserId)
        .gte("date", startDate)
        .lte("date", today)
        .order("date", { ascending: true }),
      db
        .from("moods")
        .select("rating")
        .eq("user_id", targetUserId)
        .gte("date", previousStartDate)
        .lte("date", previousEndDate),
      getUserProgress(db, targetUserId),
      db
        .from("daily_quest_assignments")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .gte("active_date", startDate)
        .lte("active_date", today),
      db
        .from("daily_quest_completions")
        .select("active_date, completed_at")
        .eq("user_id", targetUserId)
        .gte("active_date", startDate)
        .lte("active_date", today),
      db
        .from("mini_game_completions")
        .select("completed_at")
        .eq("user_id", targetUserId)
        .gte("completed_at", `${startDate}T00:00:00+07:00`),
    ]);

    if (moodsResult.error) {
      return NextResponse.json(
        { error: "Gagal memuat analytics mood.", details: moodsResult.error.message },
        { status: 503 },
      );
    }

    const moods = (moodsResult.data ?? []) as MoodRow[];
    const ratings = moods.map((mood) => mood.rating);
    const previousRatings =
      previousMoodsResult.data?.map((mood: { rating: number }) => mood.rating) ?? [];
    const currentAverage = average(ratings);
    const previousAverage = average(previousRatings);
    const trend = previousRatings.length
      ? Math.round((currentAverage - previousAverage) * 10) / 10
      : 0;
    const highestMood = [...moods].sort((a, b) => b.rating - a.rating)[0];
    const lowestMood = [...moods].sort((a, b) => a.rating - b.rating)[0];
    const moodDays = new Set(moods.map((mood) => normalizeDateString(mood.date)));
    const questCompletionCount = questCompletions.data?.length ?? 0;
    const questCompletion = questAssignments.count
      ? percent((questCompletionCount / questAssignments.count) * 100)
      : 0;

    const activeDays = new Set<string>(moodDays);
    questCompletions.data?.forEach((row: ActivityRow & { active_date?: string | null }) => {
      const date = normalizeDateString(row.active_date) || activityDate(row.completed_at);
      if (date) activeDays.add(date);
    });
    minigameCompletions.data?.forEach((row: ActivityRow) => {
      const date = activityDate(row.completed_at);
      if (date) activeDays.add(date);
    });

    const moodConsistency = percent((moodDays.size / days) * 100);
    const dailyActivity = percent((activeDays.size / days) * 100);
    const overall = Math.round((moodConsistency + questCompletion + dailyActivity) / 3);
    const activityRows = [
      ...moods,
      ...((questCompletions.data ?? []) as ActivityRow[]),
      ...((minigameCompletions.data ?? []) as ActivityRow[]),
    ];

    return NextResponse.json({
      data: {
        moodMetrics: {
          weeklyAverage: Math.round(currentAverage * 10) / 10,
          trend,
          highestDay: formatMoodDay(highestMood),
          lowestDay: formatMoodDay(lowestMood),
        },
        activityMetrics: {
          currentStreak: progress.currentStreak,
          longestStreak: Math.max(
            progress.currentStreak,
            ...moods.map((mood) => Number(mood.streak_day ?? 0)),
          ),
          mostActiveHour: mostActiveHour(activityRows),
          totalXpEarned: progress.totalXP,
        },
        engagementScore: {
          overall,
          moodConsistency,
          questCompletion,
          dailyActivity,
        },
        moodHistory: [...moods]
          .reverse()
          .slice(0, 14)
          .map((mood) => ({
            date: normalizeDateString(mood.date),
            rating: mood.rating,
            note: mood.note,
          })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal memuat engagement analytics.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
