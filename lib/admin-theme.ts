import { EMOJI_MAP, MOOD_THRESHOLDS } from "@/lib/mood-types";

export function getRatingColor(r: number): string {
  if (r === 0) return "#2a2a32";
  if (r <= MOOD_THRESHOLDS.LOW) return "#ff5757";
  if (r <= MOOD_THRESHOLDS.MEDIUM) return "#ff9f57";
  if (r <= MOOD_THRESHOLDS.HIGH) return "#57b8ff";
  return "#c8ff57";
}

export function getRatingBg(r: number): string {
  if (r === 0) return "rgba(42,42,50,0.4)";
  if (r <= MOOD_THRESHOLDS.LOW) return "rgba(255,87,87,0.15)";
  if (r <= MOOD_THRESHOLDS.MEDIUM) return "rgba(255,159,87,0.15)";
  if (r <= MOOD_THRESHOLDS.HIGH) return "rgba(87,184,255,0.15)";
  return "rgba(200,255,87,0.15)";
}

export function getRatingEmoji(rating: number): string {
  return EMOJI_MAP[rating] ?? "📊";
}

export const LEGEND_DATA = [
  { label: "Kosong", color: "#2a2a32" },
  { label: "1-3", color: "#ff5757" },
  { label: "4-6", color: "#ff9f57" },
  { label: "7-8", color: "#57b8ff" },
  { label: "9-10", color: "#c8ff57" },
];
