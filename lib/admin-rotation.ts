import { addDays } from "@/lib/date";

export type RotationCandidate = {
  id: string;
  title: string;
  category?: string | null;
  difficulty?: string | null;
  lastUsedDate?: string | null;
  playCount?: number;
  recentCategoryPenalty?: boolean;
  recentDifficultyPenalty?: boolean;
};

export type ScoredRotationCandidate = RotationCandidate & {
  score: number;
  reasons: string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(today: string, previous?: string | null) {
  if (!previous) return null;
  const currentDate = new Date(`${today}T00:00:00+07:00`);
  const previousDate = new Date(`${previous.slice(0, 10)}T00:00:00+07:00`);
  return Math.max(0, Math.round((currentDate.getTime() - previousDate.getTime()) / DAY_MS));
}

export function scoreRotationCandidate(
  candidate: RotationCandidate,
  activeDate: string,
): ScoredRotationCandidate {
  const daysSinceUsed = daysBetween(activeDate, candidate.lastUsedDate);
  const playCount = candidate.playCount ?? 0;
  const reasons: string[] = [];
  let score = 50;

  if (daysSinceUsed === null) {
    score += 45;
    reasons.push("never used");
  } else if (daysSinceUsed >= 45) {
    score += 40;
    reasons.push(`${daysSinceUsed} days since last use`);
  } else if (daysSinceUsed >= 30) {
    score += 30;
    reasons.push(`${daysSinceUsed} days since last use`);
  } else {
    score -= Math.max(10, 30 - daysSinceUsed);
    reasons.push(`used ${daysSinceUsed} days ago`);
  }

  if (playCount === 0) {
    score += 20;
    reasons.push("no completions yet");
  } else {
    score -= Math.min(25, playCount * 2);
    reasons.push(`${playCount} completions`);
  }

  if (candidate.recentCategoryPenalty) {
    score -= 12;
    reasons.push("same recent category");
  }

  if (candidate.recentDifficultyPenalty) {
    score -= 8;
    reasons.push("same recent difficulty");
  }

  return {
    ...candidate,
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons,
  };
}

export function rankRotationCandidates(
  candidates: RotationCandidate[],
  activeDate: string,
) {
  return candidates
    .map((candidate) => scoreRotationCandidate(candidate, activeDate))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

export function recentWindowStart(activeDate: string, days = 30) {
  return addDays(activeDate, -days);
}
