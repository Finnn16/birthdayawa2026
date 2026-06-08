import { NextResponse } from "next/server";
import { addDays, getTodayDateString } from "@/lib/date";
import { getTargetUserId } from "@/lib/engagement";
import { getUserProgress } from "@/lib/progress";
import { createServiceRoleClient, requireAdmin } from "@/lib/server-supabase";

type Suggestion = {
  id: string;
  scenario: string;
  priority: "high" | "medium" | "low";
  reason: string;
  recommendations: string[];
  actions: Array<{
    label: string;
    type: "template" | "calendar" | "reward" | "manual";
    href?: string;
    templateCategory?: string;
  }>;
};

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

function daysSince(date: string, today: string) {
  const current = new Date(`${today}T00:00:00+07:00`);
  const previous = new Date(`${date}T00:00:00+07:00`);
  return Math.max(0, Math.round((current.getTime() - previous.getTime()) / (24 * 60 * 60 * 1000)));
}

export async function GET() {
  const { user, error } = await requireAdmin();
  if (!user && error === "Unauthorized") return NextResponse.json({ error }, { status: 401 });
  if (error === "Forbidden") return NextResponse.json({ error }, { status: 403 });

  try {
    const db = createServiceRoleClient();
    const today = getTodayDateString();
    const startDate = addDays(today, -13);
    const targetUserId = await getTargetUserId(db);

    if (!targetUserId) {
      return NextResponse.json({ suggestions: [], context: { today, targetUserFound: false } });
    }

    const [moodsResult, progress, redemptionsResult] = await Promise.all([
      db
        .from("moods")
        .select("date, rating")
        .eq("user_id", targetUserId)
        .gte("date", startDate)
        .lte("date", today)
        .order("date", { ascending: true }),
      getUserProgress(db, targetUserId),
      db
        .from("reward_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", targetUserId)
        .eq("status", "pending"),
    ]);

    if (moodsResult.error) {
      return NextResponse.json({ error: "Gagal membaca mood untuk suggestion.", details: moodsResult.error.message }, { status: 503 });
    }

    const moods = moodsResult.data ?? [];
    const ratings = moods.map((mood) => Number(mood.rating));
    const recentThree = ratings.slice(-3);
    const previousSeven = ratings.slice(0, -3);
    const recentAverage = Math.round(average(recentThree) * 10) / 10;
    const previousAverage = Math.round(average(previousSeven) * 10) / 10;
    const latestMood = moods[moods.length - 1];
    const inactiveDays = latestMood ? daysSince(latestMood.date, today) : 99;
    const suggestions: Suggestion[] = [];

    if (recentThree.length === 3 && recentAverage <= Math.max(5, previousAverage - 1)) {
      suggestions.push({
        id: "mood-drop-support-pack",
        scenario: "Mood menurun",
        priority: "high",
        reason: `Rata-rata 3 mood terakhir ${recentAverage}/10${previousSeven.length ? `, sebelumnya ${previousAverage}/10` : ""}.`,
        recommendations: ["Hero Message Motivasi", "Easy Quest", "Bonus Hearts"],
        actions: [
          { label: "Use motivation template", type: "template", href: "/admin/studio", templateCategory: "motivation" },
          { label: "Schedule soft hero message", type: "calendar", href: "/admin/calendar" },
          { label: "Grant small bonus hearts", type: "manual", href: "/admin/dashboard" },
        ],
      });
    }

    const nextMilestone = [7, 14, 30, 60, 100].find((milestone) => milestone > progress.currentStreak);
    if (nextMilestone && nextMilestone - progress.currentStreak <= 2) {
      suggestions.push({
        id: "streak-near-milestone",
        scenario: "Streak mendekati milestone",
        priority: "medium",
        reason: `Current streak ${progress.currentStreak} hari, ${nextMilestone - progress.currentStreak} hari lagi ke milestone ${nextMilestone}.`,
        recommendations: ["Achievement Message", "Special Reward", "Unlock Letter"],
        actions: [
          { label: "Prepare romantic message", type: "template", href: "/admin/studio", templateCategory: "romantic" },
          { label: "Plan milestone content", type: "calendar", href: "/admin/calendar" },
        ],
      });
    }

    if (inactiveDays >= 3) {
      suggestions.push({
        id: "inactive-welcome-back",
        scenario: "User tidak aktif",
        priority: "high",
        reason: latestMood ? `Mood terakhir tercatat ${inactiveDays} hari lalu.` : "Belum ada mood dalam 14 hari terakhir.",
        recommendations: ["Welcome Back Message", "Simple Quest", "Bonus XP Event"],
        actions: [
          { label: "Create welcome back message", type: "template", href: "/admin/studio", templateCategory: "motivation" },
          { label: "Schedule easy quest", type: "calendar", href: "/admin/calendar" },
        ],
      });
    }

    if (!suggestions.length) {
      suggestions.push({
        id: "steady-engagement",
        scenario: "Engagement stabil",
        priority: "low",
        reason: "Tidak ada sinyal risiko besar dari mood, streak, atau inactivity.",
        recommendations: ["Maintain daily rotation", "Prepare weekly memory prompt"],
        actions: [
          { label: "Review rotation queue", type: "calendar", href: "/admin/calendar" },
          { label: "Use memory template", type: "template", href: "/admin/studio", templateCategory: "memory" },
        ],
      });
    }

    return NextResponse.json({
      suggestions,
      context: {
        today,
        targetUserFound: true,
        recentAverage,
        currentStreak: progress.currentStreak,
        inactiveDays,
        pendingRedemptions: redemptionsResult.count ?? 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal memuat smart suggestions.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
