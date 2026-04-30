// Konstanta umum - bisa dipakai di project lain
export const EMOJI_MAP: Record<number, string> = {
  1: "😭",
  2: "😔",
  3: "😞",
  4: "😐",
  5: "🙂",
  6: "😊",
  7: "😄",
  8: "🤩",
  9: "🔥",
  10: "👑",
};

export const MOOD_THRESHOLDS = {
  LOW: 3,
  MEDIUM: 6,
  HIGH: 8,
} as const;

export const CALENDAR_CONFIG = {
  WEEKS_DISPLAYED: 12,
  TOTAL_DAYS: 84, // 12 * 7
  NOTE_PREVIEW_LENGTH: 60,
} as const;

// Tipe data umum
export type Mood = {
  id: string;
  date: string;
  rating: number;
  note: string | null;
  streak_day: number;
  xp_earned: number;
  created_at: string;
};

export type Stats = {
  totalDays: number;
  avgRating: number;
  currentStreak: number;
  totalXP: number;
  highestRating: number;
  lowestRating: number;
};

export type CalendarDay = {
  date: string;
  rating: number;
};
