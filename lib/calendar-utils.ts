import {
  CALENDAR_CONFIG,
  MOOD_THRESHOLDS,
  type CalendarDay,
  type Mood,
} from "./mood-types";

// Format tanggal sesuai locale
export function formatDate(
  dateStr: string,
  locale: string = "id-ID",
  options?: Intl.DateTimeFormatOptions,
): string {
  try {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString(locale, options);
  } catch {
    return dateStr;
  }
}

// Build kalender 84 hari (12 minggu) dari data mood
export function buildCalendarData(moods: Mood[]): CalendarDay[] {
  const moodByDate: Record<string, number> = {};
  moods.forEach((m) => {
    moodByDate[m.date] = m.rating;
  });

  // Mundur ke hari Minggu terdekat sebagai start
  const today = new Date();
  const gridStart = new Date(today);
  gridStart.setDate(
    today.getDate() -
      (CALENDAR_CONFIG.WEEKS_DISPLAYED - 1) * 7 -
      today.getDay(),
  );

  const days: CalendarDay[] = [];
  const cur = new Date(gridStart);

  while (cur <= today) {
    const dateStr = cur.toISOString().split("T")[0];
    days.push({ date: dateStr, rating: moodByDate[dateStr] ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }

  return days.slice(-CALENDAR_CONFIG.TOTAL_DAYS);
}

// Filter mood yang punya notes
export function getMoodsWithNotes(moods: Mood[]): Mood[] {
  return moods.filter((m) => m.note && m.note.trim() !== "");
}
