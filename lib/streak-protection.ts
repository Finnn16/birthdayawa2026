import { addDays, getTodayDateString } from "@/lib/date";

type DbLike = {
  from: (table: string) => any;
};

type MoodRow = {
  id: string;
  date: string;
  streak_day: number;
};

function toDateString(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function getYesterdayDateString() {
  return addDays(getTodayDateString(), -1);
}

export async function getApprovedProtectedDates(db: DbLike, userId: string): Promise<Set<string>> {
  const { data } = await db
    .from("streak_protection_logs")
    .select("protected_date")
    .eq("user_id", userId)
    .eq("status", "approved");

  return new Set((data ?? []).map((item: { protected_date: string }) => toDateString(item.protected_date)));
}

export async function getNextMoodStreakDay(
  db: DbLike,
  userId: string,
  moodDate = getTodayDateString(),
): Promise<number> {
  const { data: lastMood } = await db
    .from("moods")
    .select("date, streak_day")
    .eq("user_id", userId)
    .lt("date", moodDate)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastMood) return 1;

  const protectedDates = await getApprovedProtectedDates(db, userId);
  let cursor = toDateString(lastMood.date);
  let streak = Number(lastMood.streak_day) || 1;

  while (true) {
    const nextDate = addDays(cursor, 1);
    if (nextDate === moodDate) return streak + 1;
    if (!protectedDates.has(nextDate) || nextDate > moodDate) return 1;
    streak += 1;
    cursor = nextDate;
  }
}

export async function getCurrentStreakWithProtection(db: DbLike, userId: string): Promise<number> {
  const today = getTodayDateString();
  const { data: lastMood } = await db
    .from("moods")
    .select("date, streak_day")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastMood) return 0;

  const protectedDates = await getApprovedProtectedDates(db, userId);
  let cursor = toDateString(lastMood.date);
  let streak = Number(lastMood.streak_day) || 0;

  while (cursor < today) {
    const nextDate = addDays(cursor, 1);
    if (!protectedDates.has(nextDate)) break;
    streak += 1;
    cursor = nextDate;
  }

  return streak;
}

export async function recalculateUserMoodStreaks(db: DbLike, userId: string) {
  const [{ data: moods }, protectedDates] = await Promise.all([
    db
      .from("moods")
      .select("id, date, streak_day")
      .eq("user_id", userId)
      .order("date", { ascending: true }),
    getApprovedProtectedDates(db, userId),
  ]);

  let lastDate: string | null = null;
  let lastStreak = 0;

  for (const mood of (moods ?? []) as MoodRow[]) {
    const moodDate = toDateString(mood.date);
    let nextStreak = 1;

    if (lastDate) {
      let cursor = lastDate;
      let streak = lastStreak;
      while (true) {
        const nextDate = addDays(cursor, 1);
        if (nextDate === moodDate) {
          nextStreak = streak + 1;
          break;
        }
        if (!protectedDates.has(nextDate) || nextDate > moodDate) {
          nextStreak = 1;
          break;
        }
        streak += 1;
        cursor = nextDate;
      }
    }

    if (mood.streak_day !== nextStreak) {
      await db.from("moods").update({ streak_day: nextStreak }).eq("id", mood.id);
    }

    lastDate = moodDate;
    lastStreak = nextStreak;
  }
}
