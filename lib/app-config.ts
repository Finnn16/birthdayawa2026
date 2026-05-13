export const APP_TIME_ZONE = "Asia/Jakarta";

export const BIRTHDAY_DATE = "2026-05-25";
export const BIRTHDAY_START_DATE = "2026-05-08";

export const DEFAULT_ADMIN_EMAIL = "harfintaufiq@gmail.com";
export const DEFAULT_TARGET_USER_EMAIL = "awliyanajwa255@gmail.com";

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS;
  const emails = raw?.split(",").map((email) => email.trim().toLowerCase());
  return emails?.filter(Boolean).length ? emails.filter(Boolean) : [DEFAULT_ADMIN_EMAIL];
}

export function getTargetUserEmail(): string {
  return (
    process.env.TARGET_USER_EMAIL ??
    process.env.NEXT_PUBLIC_TARGET_USER_EMAIL ??
    DEFAULT_TARGET_USER_EMAIL
  ).toLowerCase();
}

export const MINI_GAME_TYPES = [
  "Love Quiz",
  "Daily Question",
  "This-or-That",
  "Memory Prompt",
  "Guess the Date",
  "Small Challenge",
] as const;

export const MINI_GAME_DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

export const MAX_ACTIVE_MINI_GAMES = 3;
