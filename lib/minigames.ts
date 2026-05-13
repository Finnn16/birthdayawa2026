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
): boolean {
  if (!correctAnswer?.trim()) return true;
  if (typeof submittedAnswer !== "string") return false;
  return submittedAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
}

export function wouldExceedActiveLimit(currentActiveCount: number): boolean {
  return currentActiveCount >= MAX_ACTIVE_MINI_GAMES;
}
