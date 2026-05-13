"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { BIRTHDAY_DATE, BIRTHDAY_START_DATE } from "@/lib/app-config";
import { createClient } from "@/lib/supabase";
import { EMOJI_MAP, type LevelProgressData } from "@/lib/mood-types";
import { type MiniGame } from "@/lib/minigames";
import { LoadingButton, LoadingSpinner } from "@/components/LoadingSpinner";

const ratingColor = (r: number) => {
  if (r <= 3) return "#ff5757";
  if (r <= 6) return "#ff9f57";
  if (r <= 8) return "#57b8ff";
  return "#c8ff57";
};

type DashboardData = {
  todayMood: { rating: number; note: string | null; streak_day: number } | null;
  history: {
    date: string;
    rating: number;
    streak_day: number;
    xp_earned: number;
  }[];
  totalXP: number;
  currentStreak: number;
  streakMultiplier: number;
  level: LevelProgressData;
};

type MiniGameCompletionData = {
  minigame_id: string;
  is_correct: boolean;
  xp_earned: number;
};

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [miniGames, setMiniGames] = useState<MiniGame[]>([]);
  const [completions, setCompletions] = useState<MiniGameCompletionData[]>([]);
  const [miniGameMessage, setMiniGameMessage] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittingGameId, setSubmittingGameId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    streakDay: number;
    xpEarned: number;
    multiplier?: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");

  const fetchMiniGames = useCallback(async () => {
    const res = await fetch("/api/minigames");
    if (res.status === 401) return;

    const json = await res.json();
    setMiniGames(json.minigames ?? []);
    setCompletions(json.completions ?? []);
    setMiniGameMessage(json.message ?? "");
  }, []);

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
    fetchMiniGames();
  }, [fetchMiniGames, router]);

  useEffect(() => {
    fetchData();
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

    const delay = rating <= 3 ? 1800 : rating <= 6 ? 800 : 400;
    await new Promise((resolve) => setTimeout(resolve, delay));

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

  async function handleMiniGameComplete(gameId: string) {
    setSubmittingGameId(gameId);
    setMiniGameMessage("");

    const res = await fetch(`/api/minigames/${gameId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: answers[gameId] ?? "" }),
    });
    const json = await res.json();

    if (!res.ok) {
      setMiniGameMessage(json.error ?? "Mini-game belum bisa disimpan.");
      setSubmittingGameId(null);
      return;
    }

    setMiniGameMessage(
      json.isCorrect
        ? `Yeay, +${json.xpEarned} XP dari mini-game.`
        : "Jawabannya belum pas, tapi tetap dicatat ya.",
    );
    setSubmittingGameId(null);
    fetchData();
  }

  async function handleLogout() {
    setLogoutLoading(true);
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setLogoutLoading(false);
    router.push("/login");
  }

  const completionByGameId = useMemo(
    () =>
      completions.reduce<Record<string, MiniGameCompletionData>>((map, completion) => {
        map[completion.minigame_id] = completion;
        return map;
      }, {}),
    [completions],
  );

  if (loading) {
    return (
      <div style={s.centerPage}>
        <LoadingSpinner label="Ambil data kamu..." />
      </div>
    );
  }

  const alreadySubmitted = !!data?.todayMood;
  const currentColor = ratingColor(rating);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <span style={s.logo}>💗 BirthdayAwa</span>
        </div>
        <div style={s.headerRight}>
          <span style={s.username}>@{username}</span>
          <LoadingButton
            style={s.logoutBtn}
            onClick={handleLogout}
            loading={logoutLoading}
          >
            Keluar
          </LoadingButton>
        </div>
      </div>

      <div style={s.statsBar}>
        <StatChip emoji="⚡" label="Total XP" value={`${data?.totalXP ?? 0} XP`} />
        <StatChip
          emoji="💞"
          label="Level"
          value={
            data?.level
              ? `${data.level.currentLevel.levelNumber} - ${data.level.currentLevel.levelName}`
              : "Level 1"
          }
        />
        <StatChip
          emoji="🔥"
          label="Streak"
          value={`${data?.currentStreak ?? 0} hari`}
        />
        <StatChip
          emoji="✨"
          label="Multiplier"
          value={`${data?.streakMultiplier ?? 1}x`}
        />
      </div>

      <div style={s.main}>
        <BirthdayCountdown />

        {data?.level && <LevelCard level={data.level} />}

        <div style={s.card}>
          {alreadySubmitted ? (
            <AlreadyDone mood={data!.todayMood!} />
          ) : result ? (
            <ResultView result={result} onReset={() => setResult(null)} />
          ) : (
            <>
              <h2 style={s.cardTitle}>Gimana hari ini sayaaangku?</h2>

              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 64, display: "block", lineHeight: 1.2 }}>
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

              <textarea
                style={s.textarea}
                placeholder="Cerita dikit dungss mwehehe mau dengar mwaah"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />

              {error && <p style={s.error}>{error}</p>}

              <LoadingButton
                style={{ ...s.submitBtn, background: currentColor }}
                onClick={handleSubmit}
                loading={submitting}
              >
                Catat Mood
              </LoadingButton>
            </>
          )}
        </div>

        <MiniGamesSection
          miniGames={miniGames}
          completions={completionByGameId}
          answers={answers}
          message={miniGameMessage}
          submittingGameId={submittingGameId}
          onAnswerChange={(gameId, value) =>
            setAnswers((current) => ({ ...current, [gameId]: value }))
          }
          onComplete={handleMiniGameComplete}
        />

        {(data?.history?.length ?? 0) > 0 && (
          <div style={s.card}>
            <h2 style={s.cardTitle}>7 Hari Terakhir</h2>
            <div style={s.historyGrid}>
              {data!.history.map((m) => (
                <div key={m.date} style={s.historyItem}>
                  <span style={{ fontSize: 24 }}>{EMOJI_MAP[m.rating]}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {new Date(m.date + "T00:00:00").toLocaleDateString("id-ID", {
                      weekday: "short",
                      day: "numeric",
                    })}
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
        <div style={s.statValue}>{value}</div>
      </div>
    </div>
  );
}

function LevelCard({ level }: { level: LevelProgressData }) {
  return (
    <div style={s.card}>
      <div style={s.levelHeader}>
        <div>
          <p style={s.kicker}>Love Level</p>
          <h2 style={s.levelTitle}>
            Level {level.currentLevel.levelNumber} - {level.currentLevel.levelName}
          </h2>
        </div>
        <span style={s.levelXP}>{level.totalXP} XP</span>
      </div>
      <div style={s.progressTrack}>
        <div style={{ ...s.progressFill, width: `${level.progressPercent}%` }} />
      </div>
      <p style={s.progressText}>
        {level.nextLevel
          ? `${level.progressXP}/${level.requiredForNext} XP menuju ${level.nextLevel.levelName}`
          : "Level maksimum, cintanya sudah endless."}
      </p>
    </div>
  );
}

function AlreadyDone({
  mood,
}: {
  mood: { rating: number; note: string | null; streak_day: number };
}) {
  return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      <span style={{ fontSize: 56 }}>{EMOJI_MAP[mood.rating]}</span>
      <h3 style={{ fontFamily: "Syne, sans-serif", marginTop: 12 }}>
        YEAAY sudah direcord, nanti acuu pantauu yaa sayaangkuu 💗
      </h3>
      <p style={{ color: "var(--text-muted)", marginTop: 8, fontSize: 14 }}>
        Mood:{" "}
        <strong style={{ color: ratingColor(mood.rating) }}>{mood.rating}/10</strong>
        {mood.streak_day > 1 && ` · 🔥 ${mood.streak_day} hari berturut-turut`}
      </p>
      {mood.note && (
        <p style={s.notePreview}>&quot;{mood.note}&quot;</p>
      )}
      <p style={{ marginTop: 16, fontSize: 13, color: "var(--text-muted)" }}>
        jangan lupa besok isi lagi yyaa!!! 💕
      </p>
    </div>
  );
}

function ResultView({
  result,
}: {
  result: { message: string; streakDay: number; xpEarned: number; multiplier?: number };
  onReset: () => void;
}) {
  return (
    <div style={s.resultView}>
      <p style={s.resultMessage}>{result.message}</p>
      <div style={s.resultChips}>
        <span style={s.chip}>+{result.xpEarned} XP</span>
        {result.multiplier && result.multiplier > 1 && (
          <span style={s.chip}>{result.multiplier}x streak</span>
        )}
        {result.streakDay > 1 && <span style={s.chip}>🔥 {result.streakDay} hari streak</span>}
      </div>
    </div>
  );
}

function MiniGamesSection({
  miniGames,
  completions,
  answers,
  message,
  submittingGameId,
  onAnswerChange,
  onComplete,
}: {
  miniGames: MiniGame[];
  completions: Record<string, MiniGameCompletionData>;
  answers: Record<string, string>;
  message: string;
  submittingGameId: string | null;
  onAnswerChange: (gameId: string, value: string) => void;
  onComplete: (gameId: string) => void;
}) {
  return (
    <div style={s.card}>
      <h2 style={s.cardTitle}>Mini-game Hari Ini</h2>
      {message && <p style={s.infoText}>{message}</p>}
      {miniGames.length === 0 ? (
        <p style={s.emptyText}>Belum ada mini-game aktif. Nanti admin bisa masukin kejutan kecil di sini.</p>
      ) : (
        <div style={s.gameList}>
          {miniGames.map((game) => {
            const completion = completions[game.id];
            const options = Array.isArray(game.options_json)
              ? game.options_json.filter((item): item is string => typeof item === "string")
              : [];

            return (
              <div key={game.id} style={s.gameCard}>
                <div style={s.gameHeader}>
                  <div>
                    <p style={s.kicker}>
                      {game.type} · {game.difficulty}
                    </p>
                    <h3 style={s.gameTitle}>{game.title}</h3>
                  </div>
                  <span style={s.gameXP}>+{game.xp_reward} XP</span>
                </div>
                {game.description && <p style={s.gameDescription}>{game.description}</p>}
                {game.prompt && <p style={s.gamePrompt}>{game.prompt}</p>}

                {completion ? (
                  <p style={s.doneText}>
                    Selesai · {completion.is_correct ? "benar" : "dicatat"} · +{completion.xp_earned} XP
                  </p>
                ) : (
                  <>
                    {options.length > 0 ? (
                      <div style={s.optionGrid}>
                        {options.map((option) => (
                          <button
                            key={option}
                            type="button"
                            style={{
                              ...s.optionBtn,
                              ...(answers[game.id] === option ? s.optionBtnActive : {}),
                            }}
                            onClick={() => onAnswerChange(game.id, option)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        style={s.textarea}
                        placeholder="Tulis jawaban kecil di sini..."
                        value={answers[game.id] ?? ""}
                        onChange={(e) => onAnswerChange(game.id, e.target.value)}
                        rows={2}
                      />
                    )}
                    <LoadingButton
                      style={s.secondaryBtn}
                      loading={submittingGameId === game.id}
                      onClick={() => onComplete(game.id)}
                    >
                      Selesaikan
                    </LoadingButton>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BirthdayCountdown() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const targetTime = new Date(`${BIRTHDAY_DATE}T00:00:00+07:00`).getTime();
  const startTime = new Date(`${BIRTHDAY_START_DATE}T00:00:00+07:00`).getTime();
  const totalWindow = targetTime - startTime;
  const remaining = now ? Math.max(targetTime - now, 0) : totalWindow;

  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  async function handleCelebrate() {
    const confetti = (await import("canvas-confetti")).default;
    confetti({
      particleCount: 180,
      spread: 78,
      startVelocity: 42,
      scalar: 1.05,
      origin: { x: 0.5, y: 0.62 },
      colors: ["#ff4f9a", "#ff86bf", "#ffd3e4", "#ffb7d2", "#fff0f7"],
    });
  }

  return (
    <div style={s.birthdayCard}>
      <div style={s.birthdayGlow} />
      <h2 style={s.birthdayHeadline}>ULANG TAHUN SAYAAANGKU 💝💖</h2>
      <div style={s.countdownGrid}>
        <CountdownTile value={String(days).padStart(2, "0")} label="Hari" />
        <CountdownTile value={String(hours).padStart(2, "0")} label="Jam" />
        <CountdownTile value={String(minutes).padStart(2, "0")} label="Menit" />
        <CountdownTile value={String(seconds).padStart(2, "0")} label="Detik" />
      </div>
      <div style={s.birthdayActions}>
        <button type="button" style={s.surpriseBtn} onClick={handleCelebrate}>
          Surprise
        </button>
      </div>
    </div>
  );
}

function CountdownTile({ value, label }: { value: string; label: string }) {
  return (
    <div style={s.countdownTile}>
      <span style={s.countdownValue}>{value}</span>
      <span style={s.countdownLabel}>{label}</span>
    </div>
  );
}

const s: Record<string, CSSProperties> = {
  centerPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  page: {
    minHeight: "100vh",
    padding: "0 0 80px",
    background:
      "radial-gradient(circle at top, rgba(255,176,215,0.18) 0%, transparent 42%), radial-gradient(circle at 20% 20%, rgba(255,105,180,0.10) 0%, transparent 28%), linear-gradient(180deg, #180c13 0%, #130a10 100%)",
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
  statValue: {
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "Syne, sans-serif",
    whiteSpace: "nowrap",
  },
  main: {
    maxWidth: 640,
    margin: "0 auto",
    padding: "16px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  card: {
    background:
      "linear-gradient(180deg, rgba(61,34,48,0.96) 0%, rgba(45,24,32,0.96) 100%)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 24,
    boxShadow: "0 16px 40px rgba(0, 0, 0, 0.18)",
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Syne, sans-serif",
    fontWeight: 700,
    marginBottom: 20,
  },
  kicker: {
    color: "var(--text-muted)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  levelHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
  },
  levelTitle: {
    fontFamily: "Syne, sans-serif",
    fontSize: 18,
    lineHeight: 1.25,
  },
  levelXP: {
    color: "var(--accent)",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  progressTrack: {
    marginTop: 18,
    height: 10,
    borderRadius: 999,
    background: "var(--surface2)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #ff7eb6, #c8ff57)",
  },
  progressText: {
    marginTop: 10,
    color: "var(--text-muted)",
    fontSize: 13,
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
  },
  secondaryBtn: {
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: 10,
    background: "var(--accent)",
    color: "#210d18",
    fontFamily: "Syne, sans-serif",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
  error: { fontSize: 13, color: "var(--red)", marginBottom: 8 },
  infoText: {
    color: "var(--accent)",
    fontSize: 13,
    marginBottom: 12,
  },
  emptyText: {
    color: "var(--text-muted)",
    fontSize: 14,
    lineHeight: 1.5,
  },
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
    border: "1px solid rgba(229,136,191,0.24)",
    borderRadius: 20,
    padding: "4px 14px",
    fontSize: 13,
    fontWeight: 600,
  },
  notePreview: {
    marginTop: 12,
    fontSize: 14,
    color: "var(--text-muted)",
    fontStyle: "italic",
  },
  resultView: {
    textAlign: "center",
    padding: "16px 0",
    animation: "fadeIn 0.5s ease",
  },
  resultMessage: {
    fontSize: 16,
    lineHeight: 1.6,
    color: "var(--text)",
    marginBottom: 16,
  },
  resultChips: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  gameList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  gameCard: {
    background: "rgba(255, 241, 247, 0.06)",
    border: "1px solid rgba(255, 195, 219, 0.16)",
    borderRadius: 12,
    padding: 16,
  },
  gameHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  gameTitle: {
    fontFamily: "Syne, sans-serif",
    fontSize: 15,
    lineHeight: 1.35,
  },
  gameXP: {
    color: "#c8ff57",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  gameDescription: {
    color: "var(--text-muted)",
    fontSize: 13,
    lineHeight: 1.5,
    marginTop: 8,
  },
  gamePrompt: {
    fontSize: 14,
    lineHeight: 1.5,
    marginTop: 12,
    marginBottom: 10,
  },
  optionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 8,
    marginBottom: 10,
  },
  optionBtn: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--surface2)",
    color: "var(--text)",
    cursor: "pointer",
  },
  optionBtnActive: {
    borderColor: "var(--accent)",
    background: "var(--accent-dim)",
    color: "var(--accent)",
    fontWeight: 700,
  },
  doneText: {
    marginTop: 12,
    color: "#c8ff57",
    fontSize: 13,
    fontWeight: 700,
  },
  birthdayCard: {
    position: "relative",
    overflow: "hidden",
    padding: 22,
    borderRadius: "calc(var(--radius) + 4px)",
    border: "1px solid rgba(255, 161, 201, 0.32)",
    background:
      "linear-gradient(135deg, rgba(255, 105, 180, 0.16) 0%, rgba(255, 214, 230, 0.1) 48%, rgba(61, 34, 48, 0.96) 100%)",
    boxShadow: "0 24px 60px rgba(255, 105, 180, 0.14)",
  },
  birthdayHeadline: {
    position: "relative",
    zIndex: 1,
    marginBottom: 14,
    textAlign: "center",
    fontFamily: "Quicksand, sans-serif",
    fontSize: 26,
    lineHeight: 1.15,
    fontWeight: 700,
    color: "#fff1f8",
  },
  birthdayGlow: {
    position: "absolute",
    inset: "auto -30px -60px auto",
    width: 150,
    height: 150,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255, 143, 188, 0.35) 0%, transparent 70%)",
    filter: "blur(8px)",
    pointerEvents: "none",
  },
  countdownGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 10,
  },
  countdownTile: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: "16px 10px",
    borderRadius: 16,
    background: "rgba(255, 241, 247, 0.08)",
    border: "1px solid rgba(255, 195, 219, 0.18)",
  },
  countdownValue: {
    fontFamily: "Quicksand, sans-serif",
    fontSize: 34,
    fontWeight: 800,
    lineHeight: 1,
    color: "#fff1f8",
  },
  countdownLabel: {
    fontSize: 12,
    color: "#f5bfd4",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  birthdayActions: {
    marginTop: 14,
    display: "flex",
    justifyContent: "center",
  },
  surpriseBtn: {
    border: "none",
    borderRadius: 999,
    padding: "12px 20px",
    background: "linear-gradient(135deg, #ff7eb6 0%, #ffc6dd 100%)",
    color: "#31111f",
    fontFamily: "Quicksand, sans-serif",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 14px 28px rgba(255, 126, 182, 0.28)",
  },
};
