"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const EMOJI_MAP: Record<number, string> = {
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

const ratingColor = (r: number) => {
  if (r <= 3) return "#ff5757";
  if (r <= 6) return "#ff9f57";
  if (r <= 8) return "#57b8ff";
  return "#c8ff57";
};

type DashboardData = {
  todayMood: { rating: number; note: string; streak_day: number } | null;
  history: {
    date: string;
    rating: number;
    streak_day: number;
    xp_earned: number;
  }[];
  totalXP: number;
  currentStreak: number;
};

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [rating, setRating] = useState(5);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    streakDay: number;
    xpEarned: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/moods");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchData();
    // Get username
    createClient()
      .auth.getUser()
      .then(({ data: d }) => {
        setUsername(
          d.user?.user_metadata?.username || d.user?.email?.split("@")[0] || "",
        );
      });
  }, [fetchData]);

  async function handleSubmit() {
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/moods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, note }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error);
      setSubmitting(false);
      return;
    }

    // Delay untuk mood rendah — biar kerasa "dipikirin"
    const delay = rating <= 3 ? 1800 : rating <= 6 ? 800 : 400;
    await new Promise((r) => setTimeout(r, delay));

    // Confetti untuk mood tinggi
    if (rating >= 8 && typeof window !== "undefined") {
      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: rating === 10 ? 200 : 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#c8ff57", "#57b8ff", "#ff9f57"],
      });
    }

    setResult(json);
    setSubmitting(false);
    fetchData();
  }

  async function handleLogout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/login");
  }

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p
          style={{ color: "var(--text-muted)", fontFamily: "Syne, sans-serif" }}
        >
          loading...
        </p>
      </div>
    );

  const alreadySubmitted = !!data?.todayMood;
  const currentColor = ratingColor(rating);

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <span style={s.logo}>🌡 MoodTrack</span>
        </div>
        <div style={s.headerRight}>
          <span style={s.username}>@{username}</span>
          <button style={s.logoutBtn} onClick={handleLogout}>
            Keluar
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={s.statsBar}>
        <StatChip
          emoji="⚡"
          label="Total XP"
          value={`${data?.totalXP ?? 0} XP`}
        />
        <StatChip
          emoji="🔥"
          label="Streak"
          value={`${data?.currentStreak ?? 0} hari`}
        />
        <StatChip
          emoji="📅"
          label="Catatan"
          value={`${data?.history.length ?? 0} hari`}
        />
      </div>

      <div style={s.main}>
        {/* INPUT CARD */}
        <div style={s.card}>
          {alreadySubmitted ? (
            <AlreadyDone mood={data!.todayMood!} />
          ) : result ? (
            <ResultView result={result} onReset={() => setResult(null)} />
          ) : (
            <>
              <h2 style={s.cardTitle}>Gimana hari ini sayaaangku?</h2>

              {/* Emoji display */}
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <span
                  style={{ fontSize: 64, display: "block", lineHeight: 1.2 }}
                >
                  {EMOJI_MAP[rating]}
                </span>
                <span
                  style={{
                    ...s.ratingBadge,
                    color: currentColor,
                    borderColor: currentColor,
                  }}
                >
                  {rating}/10
                </span>
              </div>

              {/* Slider */}
              <div style={s.sliderWrap}>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  style={{ ...s.slider, accentColor: currentColor }}
                />
                <div style={s.sliderLabels}>
                  <span>berat</span>
                  <span>mantep</span>
                </div>
              </div>

              {/* Note */}
              <textarea
                style={s.textarea}
                placeholder="Cerita dikit dungss mwehehe mau dengar mwaah"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />

              {error && <p style={s.error}>{error}</p>}

              <button
                style={{
                  ...s.submitBtn,
                  background: currentColor,
                  opacity: submitting ? 0.7 : 1,
                }}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? rating <= 3
                    ? "lagi dipikirin..."
                    : "nyimpen..."
                  : "Catat Mood"}
              </button>
            </>
          )}
        </div>

        {/* HISTORY */}
        {(data?.history?.length ?? 0) > 0 && (
          <div style={s.card}>
            <h2 style={s.cardTitle}>7 Hari Terakhir</h2>
            <div style={s.historyGrid}>
              {data!.history.map((m) => (
                <div key={m.date} style={s.historyItem}>
                  <span style={{ fontSize: 24 }}>{EMOJI_MAP[m.rating]}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {new Date(m.date + "T00:00:00").toLocaleDateString(
                      "id-ID",
                      { weekday: "short", day: "numeric" },
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: ratingColor(m.rating),
                    }}
                  >
                    {m.rating}/10
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatChip({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <div style={s.statChip}>
      <span>{emoji}</span>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            fontFamily: "Syne, sans-serif",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function AlreadyDone({
  mood,
}: {
  mood: { rating: number; note: string; streak_day: number };
}) {
  return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      <span style={{ fontSize: 56 }}>{EMOJI_MAP[mood.rating]}</span>
      <h3 style={{ fontFamily: "Syne, sans-serif", marginTop: 12 }}>
        YEAAY SUDAH DIRECORD, nanti acuu pantauu yaa sayaangkuu 👍
      </h3>
      <p style={{ color: "var(--text-muted)", marginTop: 8, fontSize: 14 }}>
        Mood:{" "}
        <strong style={{ color: ratingColor(mood.rating) }}>
          {mood.rating}/10
        </strong>
        {mood.streak_day > 1 && ` · 🔥 ${mood.streak_day} hari berturut-turut`}
      </p>
      {mood.note && (
        <p
          style={{
            marginTop: 12,
            fontSize: 14,
            color: "var(--text-muted)",
            fontStyle: "italic",
          }}
        >
          "{mood.note}"
        </p>
      )}
      <p style={{ marginTop: 16, fontSize: 13, color: "var(--text-muted)" }}>
        jangan lupa besok isi lagi yyaa!!! 💕
      </p>
    </div>
  );
}

function ResultView({
  result,
  onReset,
}: {
  result: { message: string; streakDay: number; xpEarned: number };
  onReset: () => void;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "16px 0",
        animation: "fadeIn 0.5s ease",
      }}
    >
      <p
        style={{
          fontSize: 16,
          lineHeight: 1.6,
          color: "var(--text)",
          marginBottom: 16,
        }}
      >
        {result.message}
      </p>
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={s.chip}>+{result.xpEarned} XP</span>
        {result.streakDay > 1 && (
          <span style={s.chip}>🔥 {result.streakDay} hari streak</span>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "0 0 80px",
    background:
      "radial-gradient(ellipse at 50% -10%, rgba(200,255,87,0.05) 0%, transparent 50%)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid var(--border)",
  },
  logo: {
    fontFamily: "Syne, sans-serif",
    fontWeight: 800,
    fontSize: 18,
    color: "var(--accent)",
  },
  headerRight: { display: "flex", gap: 16, alignItems: "center" },
  username: { fontSize: 14, color: "var(--text-muted)" },
  logoutBtn: {
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--text-muted)",
    borderRadius: 8,
    padding: "6px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "DM Sans, sans-serif",
  },
  statsBar: {
    display: "flex",
    gap: 12,
    padding: "16px 24px",
    overflowX: "auto",
  },
  statChip: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "10px 16px",
    minWidth: 120,
    flexShrink: 0,
  },
  main: {
    maxWidth: 480,
    margin: "0 auto",
    padding: "16px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Syne, sans-serif",
    fontWeight: 700,
    marginBottom: 20,
  },
  ratingBadge: {
    display: "inline-block",
    marginTop: 8,
    padding: "4px 16px",
    border: "1px solid",
    borderRadius: 20,
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "Syne, sans-serif",
  },
  sliderWrap: { marginBottom: 16 },
  slider: {
    width: "100%",
    height: 6,
    cursor: "pointer",
    appearance: "none",
    borderRadius: 4,
    background: "var(--surface2)",
    outline: "none",
  },
  sliderLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: "var(--text-muted)",
    marginTop: 6,
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    color: "var(--text)",
    fontFamily: "DM Sans, sans-serif",
    fontSize: 14,
    resize: "vertical",
    outline: "none",
    marginBottom: 8,
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: 10,
    color: "#0d0d0f",
    fontFamily: "Syne, sans-serif",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
  error: { fontSize: 13, color: "var(--red)", marginBottom: 8 },
  historyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 8,
  },
  historyItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    padding: "8px 4px",
    background: "var(--surface2)",
    borderRadius: 10,
  },
  chip: {
    background: "var(--accent-dim)",
    color: "var(--accent)",
    border: "1px solid rgba(200,255,87,0.2)",
    borderRadius: 20,
    padding: "4px 14px",
    fontSize: 13,
    fontWeight: 600,
  },
};
