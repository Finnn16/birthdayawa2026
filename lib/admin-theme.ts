import { EMOJI_MAP, MOOD_THRESHOLDS } from "@/lib/mood-types";

/**
 * Admin Dashboard Color Scheme & Styling Functions
 * Project-specific styling untuk mood tracking admin
 */

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

export const ADMIN_STYLES = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(ellipse at 50% -10%, rgba(87,184,255,0.05) 0%, transparent 50%)",
  } as React.CSSProperties,

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "20px 24px",
    borderBottom: "1px solid var(--border)",
  } as React.CSSProperties,

  headerTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  } as React.CSSProperties,

  logo: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: 18,
    color: "var(--accent)",
  } as React.CSSProperties,

  adminBadge: {
    background: "rgba(87,184,255,0.15)",
    color: "var(--blue)",
    border: "1px solid rgba(87,184,255,0.3)",
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
  } as React.CSSProperties,

  headerSub: {
    fontSize: 13,
    color: "var(--text-muted)",
  } as React.CSSProperties,

  backBtn: {
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--text-muted)",
    borderRadius: 8,
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
  } as React.CSSProperties,

  container: {
    maxWidth: 760,
    margin: "0 auto",
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  } as React.CSSProperties,

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  } as React.CSSProperties,

  statCard: {
    background: "var(--surface)",
    border: "1px solid",
    borderRadius: 12,
    padding: "14px 16px",
    display: "flex",
    gap: 12,
    alignItems: "center",
  } as React.CSSProperties,

  tabs: {
    display: "flex",
    gap: 8,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 6,
  } as React.CSSProperties,

  tab: {
    flex: 1,
    padding: "10px",
    border: "none",
    borderRadius: 8,
    background: "transparent",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 500,
    transition: "all 0.2s",
  } as React.CSSProperties,

  tabActive: {
    background: "var(--surface2)",
    color: "var(--text)",
    fontWeight: 600,
  } as React.CSSProperties,

  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 24,
  } as React.CSSProperties,

  cardTitle: {
    fontSize: 15,
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    marginBottom: 20,
  } as React.CSSProperties,

  legend: {
    display: "flex",
    gap: 16,
    marginTop: 16,
    flexWrap: "wrap" as const,
  } as React.CSSProperties,

  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "var(--text-muted)",
  } as React.CSSProperties,

  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
  } as React.CSSProperties,
};

export const LEGEND_DATA = [
  { label: "Kosong", color: "#2a2a32" },
  { label: "1-3", color: "#ff5757" },
  { label: "4-6", color: "#ff9f57" },
  { label: "7-8", color: "#57b8ff" },
  { label: "9-10", color: "#c8ff57" },
];
