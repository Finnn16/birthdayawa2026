import {
  MAX_ACTIVE_MINI_GAMES,
  MINI_GAME_DIFFICULTIES,
  MINI_GAME_TYPES,
} from "@/lib/app-config";

export type MiniGameType = (typeof MINI_GAME_TYPES)[number];
export type MiniGameDifficulty = (typeof MINI_GAME_DIFFICULTIES)[number];

export type MiniGame = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  difficulty: string;
  xp_reward: number;
  hearts_reward: number;
  active_date: string | null;
  is_active: boolean;
  prompt: string | null;
  options_json: unknown;
  correct_answer: string | null;
  metadata_json: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
};

export type MiniGameCompletion = {
  id: string;
  minigame_id: string;
  user_id: string;
  is_correct: boolean;
  xp_earned: number;
  hearts_earned: number;
  completed_at: string;
  metadata_json: unknown;
};

export function isMiniGameType(value: unknown): value is MiniGameType {
  return typeof value === "string" && MINI_GAME_TYPES.includes(value as MiniGameType);
}

export function isMiniGameDifficulty(value: unknown): value is MiniGameDifficulty {
  return (
    typeof value === "string" &&
    MINI_GAME_DIFFICULTIES.includes(value as MiniGameDifficulty)
  );
}

export function validateMiniGamePayload(payload: Record<string, unknown>): string | null {
  if (!payload.title || typeof payload.title !== "string" || !payload.title.trim()) {
    return "Judul mini-game wajib diisi.";
  }

  if (!isMiniGameType(payload.type)) {
    return "Tipe mini-game tidak valid.";
  }

  if (!isMiniGameDifficulty(payload.difficulty)) {
    return "Difficulty mini-game tidak valid.";
  }

  if (
    typeof payload.xp_reward !== "number" ||
    !Number.isFinite(payload.xp_reward) ||
    payload.xp_reward < 0 ||
    payload.xp_reward > 200
  ) {
    return "XP reward harus angka 0 sampai 200.";
  }

  if (
    "hearts_reward" in payload &&
    (typeof payload.hearts_reward !== "number" ||
      !Number.isFinite(payload.hearts_reward) ||
      payload.hearts_reward < 0 ||
      payload.hearts_reward > 200)
  ) {
    return "Hearts reward harus angka 0 sampai 200.";
  }

  return null;
}

export function normalizeOptions(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value ?? null;
}

export function checkMiniGameAnswer(
  submittedAnswer: unknown,
  correctAnswer?: string | null,
  gameType?: string | null,
): boolean {
  if (!correctAnswer?.trim()) return true;
  if (typeof submittedAnswer !== "string") return false;

  const submitted = normalizeAnswerText(submittedAnswer);
  const correct = normalizeAnswerText(correctAnswer);

  if (submitted === correct) return true;

  if (gameType === "Guess the Date") {
    const submittedDate = normalizeDateAnswer(submittedAnswer);
    const correctDate = normalizeDateAnswer(correctAnswer);
    return Boolean(submittedDate && correctDate && submittedDate === correctDate);
  }

  return false;
}

export function wouldExceedActiveLimit(currentActiveCount: number): boolean {
  return currentActiveCount >= MAX_ACTIVE_MINI_GAMES;
}

function normalizeAnswerText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeDateAnswer(value: string): string | null {
  const monthNames: Record<string, string> = {
    januari: "1",
    january: "1",
    jan: "1",
    februari: "2",
    february: "2",
    feb: "2",
    maret: "3",
    march: "3",
    mar: "3",
    april: "4",
    apr: "4",
    mei: "5",
    may: "5",
    juni: "6",
    june: "6",
    jun: "6",
    juli: "7",
    july: "7",
    jul: "7",
    agustus: "8",
    august: "8",
    aug: "8",
    september: "9",
    sep: "9",
    oktober: "10",
    october: "10",
    oct: "10",
    november: "11",
    nov: "11",
    desember: "12",
    december: "12",
    dec: "12",
  };

  const normalized = normalizeAnswerText(value)
    .split(" ")
    .map((part) => monthNames[part] ?? part)
    .join(" ");
  const parts = normalized.match(/\d+/g)?.map((part) => String(Number(part))) ?? [];

  return parts.length >= 2 ? parts.join("-") : null;
}
