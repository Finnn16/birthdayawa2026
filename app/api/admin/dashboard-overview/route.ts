import { NextResponse } from "next/server";
import { BIRTHDAY_DATE, getAdminEmails } from "@/lib/app-config";
import { getTodayDateString, toJakartaMidnight } from "@/lib/date";
import { getHeartBalance, getTargetUserId } from "@/lib/engagement";
import { getUserProgress } from "@/lib/progress";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

type UserSummary = {
  id: string;
  username?: string | null;
  email?: string | null;
  role?: string | null;
};

type DatedItem = {
  title: string;
  date: string;
  source: "event" | "letter" | "birthday";
};

const DAY_MS = 24 * 60 * 60 * 1000;

function authResponse(error: "Unauthorized" | "Forbidden" | null) {
  if (error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });
  return null;
}

function normalizeDateString(value?: string | null) {
  return value?.slice(0, 10) ?? "";
}

function displayName(user: UserSummary) {
  return user.username || user.email || "Unknown user";
}

function daysUntil(date: string, today: string) {
  const targetDate = toJakartaMidnight(date);
  const todayDate = toJakartaMidnight(today);
  return Math.max(0, Math.ceil((targetDate.getTime() - todayDate.getTime()) / DAY_MS));
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(toJakartaMidnight(date));
}

export async function GET() {
  const { user, error } = await requireAdmin();
  const unauthorized = authResponse(!user && error === "Unauthorized" ? error : error);
  if (unauthorized) return unauthorized;

  try {
    const db = createServiceRoleClient();
    const today = getTodayDateString();
    const adminEmails = new Set(getAdminEmails());

    const targetUserId = await getTargetUserId(db);

    const [
      usersResult,
      todayMoodsResult,
      questsActive,
      minigamesActive,
      messagesActive,
      pendingRedemptions,
      pendingStreakRequests,
      coupleEvents,
      letters,
      progress,
      heartsBalance,
    ] = await Promise.all([
      db.from("users").select("id, username, email, role").order("username", { ascending: true }),
      db.from("moods").select("user_id, rating").eq("date", today),
      db
        .from("daily_quest_assignments")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("active_date", today),
      db
        .from("mini_games")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .or(`active_date.is.null,active_date.eq.${today}`),
      db
        .from("hero_messages")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .or(`active_date.is.null,active_date.lte.${today}`),
      db
        .from("reward_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      db
        .from("streak_protection_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      db
        .from("couple_events")
        .select("title, event_date")
        .eq("is_active", true)
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(5),
      db
        .from("letters")
        .select("title, trigger_date")
        .eq("is_active", true)
        .gte("trigger_date", today)
        .order("trigger_date", { ascending: true })
        .limit(5),
      targetUserId
        ? getUserProgress(db, targetUserId)
        : Promise.resolve({ currentStreak: 0, totalXP: 0 }),
      targetUserId ? getHeartBalance(db, targetUserId) : Promise.resolve(0),
    ]);

    if (usersResult.error) {
      return NextResponse.json(
        { error: "Gagal memuat user dashboard.", details: usersResult.error.message },
        { status: 503 },
      );
    }

    const users =
      usersResult.data?.filter((item: UserSummary) => {
        const role = String(item.role ?? "user").toLowerCase();
        const email = String(item.email ?? "").toLowerCase();
        return role !== "admin" && !adminEmails.has(email);
      }) ?? [];
    const submittedUserIds = new Set(
      todayMoodsResult.data?.map((mood: { user_id: string }) => mood.user_id) ?? [],
    );
    const ratings = todayMoodsResult.data?.map((mood: { rating: number }) => mood.rating) ?? [];
    const averageRating = ratings.length
      ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10
      : 0;

    const upcomingItems: DatedItem[] = [
      ...(coupleEvents.data?.map((item: { title: string; event_date: string }) => ({
        title: item.title,
        date: normalizeDateString(item.event_date),
        source: "event" as const,
      })) ?? []),
      ...(letters.data?.map((item: { title: string; trigger_date: string }) => ({
        title: `Letter: ${item.title}`,
        date: normalizeDateString(item.trigger_date),
        source: "letter" as const,
      })) ?? []),
      ...(BIRTHDAY_DATE >= today
        ? [{ title: "Birthday Countdown", date: BIRTHDAY_DATE, source: "birthday" as const }]
        : []),
    ]
      .filter((item) => item.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);

    return NextResponse.json({
      data: {
        todayMoodStats: {
          submissionCount: ratings.length,
          averageRating,
          submittedUsers: users
            .filter((item) => submittedUserIds.has(item.id))
            .map(displayName),
          pendingUsers: users
            .filter((item) => !submittedUserIds.has(item.id))
            .map(displayName),
        },
        activeContent: {
          questsActive: questsActive.count ?? 0,
          minigamesActive: minigamesActive.count ?? 0,
          messagesActive: messagesActive.count ?? 0,
        },
        engagementMetrics: {
          currentStreak: progress.currentStreak,
          totalXpEarned: progress.totalXP,
          heartsBalance,
        },
        upcomingEvents: upcomingItems.map((item) => ({
          title: item.title,
          date: formatDate(item.date),
          daysUntil: daysUntil(item.date, today),
          source: item.source,
        })),
        pendingActions: {
          pendingRedemptions: pendingRedemptions.count ?? 0,
          pendingStreakRequests: pendingStreakRequests.count ?? 0,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal memuat dashboard overview.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
