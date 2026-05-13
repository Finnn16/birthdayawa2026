"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { useAdminData } from "@/app/hooks/useAdminData";
import {
  MAX_ACTIVE_MINI_GAMES,
  MINI_GAME_DIFFICULTIES,
  MINI_GAME_TYPES,
} from "@/lib/app-config";
import { buildCalendarData, formatDate, getMoodsWithNotes } from "@/lib/calendar-utils";
import { getRatingBg, getRatingColor, getRatingEmoji, LEGEND_DATA } from "@/lib/admin-theme";
import { type MiniGame } from "@/lib/minigames";
import { CalendarGrid } from "@/components/common/CalendarGrid";
import { HistoryList } from "@/components/common/HistoryList";
import { NotesList } from "@/components/common/NotesList";
import { StatCard } from "@/components/common/StatCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";

type AdminTab = "calendar" | "notes" | "history" | "minigames";

type MiniGameFormState = {
  title: string;
  description: string;
  type: string;
  difficulty: string;
  xp_reward: number;
  active_date: string;
  is_active: boolean;
  prompt: string;
  options_json: string;
  correct_answer: string;
};

const emptyForm = (): MiniGameFormState => ({
  title: "",
  description: "",
  type: "Love Quiz",
  difficulty: "Easy",
  xp_reward: 20,
  active_date: new Date().toISOString().split("T")[0],
  is_active: false,
  prompt: "",
  options_json: "",
  correct_answer: "",
});

export default function AdminDashboard() {
  const router = useRouter();
  const { moods, stats, userInfo, loading, error } = useAdminData();
  const [activeTab, setActiveTab] = useState<AdminTab>("calendar");
  const [miniGames, setMiniGames] = useState<MiniGame[]>([]);
  const [miniGameLoading, setMiniGameLoading] = useState(false);
  const [miniGameMessage, setMiniGameMessage] = useState("");
  const [form, setForm] = useState<MiniGameFormState>(emptyForm);

  const calendarData = useMemo(() => buildCalendarData(moods), [moods]);
  const moodsWithNotes = useMemo(() => getMoodsWithNotes(moods), [moods]);

  const fetchMiniGames = useCallback(async () => {
    setMiniGameLoading(true);
    const res = await fetch("/api/admin/minigames");
    const json = await res.json();
    setMiniGames(json.minigames ?? []);
    setMiniGameMessage(json.message ?? json.error ?? "");
    setMiniGameLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "minigames") {
      fetchMiniGames();
    }
  }, [activeTab, fetchMiniGames]);

  async function handleCreateMiniGame() {
    setMiniGameMessage("");
    const res = await fetch("/api/admin/minigames", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();

    if (!res.ok) {
      setMiniGameMessage(json.error ?? "Gagal membuat mini-game.");
      return;
    }

    setMiniGameMessage("Mini-game berhasil dibuat.");
    setForm(emptyForm());
    fetchMiniGames();
  }

  async function handleUpdateMiniGame(game: MiniGame, patch: Partial<MiniGame>) {
    setMiniGameMessage("");
    const res = await fetch(`/api/admin/minigames/${game.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: game.title,
        description: game.description ?? "",
        type: game.type,
        difficulty: game.difficulty,
        xp_reward: game.xp_reward,
        active_date: game.active_date,
        is_active: game.is_active,
        prompt: game.prompt ?? "",
        options_json: Array.isArray(game.options_json)
          ? game.options_json.join("\n")
          : game.options_json,
        correct_answer: game.correct_answer ?? "",
        metadata_json: game.metadata_json ?? null,
        ...patch,
      }),
    });
    const json = await res.json();

    if (!res.ok) {
      setMiniGameMessage(json.error ?? "Gagal update mini-game.");
      return;
    }

    setMiniGameMessage("Mini-game berhasil diupdate.");
    fetchMiniGames();
  }

  if (loading) {
    return (
      <div style={styles.centerPage}>
        <LoadingSpinner label="loading data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centerPage}>
        <p style={{ color: "var(--red)", fontFamily: "Syne, sans-serif" }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.headerTop}>
            <span style={styles.logo}>💗 BirthdayAwa</span>
            <span style={styles.adminBadge}>ADMIN</span>
          </div>
          <p style={styles.headerSub}>
            Dashboard mood untuk{" "}
            <strong style={{ color: "var(--accent)" }}>@{userInfo?.username ?? "..."}</strong>
          </p>
        </div>
        <button style={styles.backBtn} onClick={() => router.push("/dashboard")}>
          ← Balik
        </button>
      </div>

      <div style={styles.container}>
        {stats && (
          <div style={styles.statsGrid}>
            <StatCard
              label="Rata-rata Mood"
              value={`${stats.avgRating}/10`}
              emoji={getRatingEmoji(Math.round(stats.avgRating))}
              color={getRatingColor(Math.round(stats.avgRating))}
              style={{ ...styles.statCard, borderColor: getRatingColor(Math.round(stats.avgRating)) + "30" }}
            />
            <StatCard label="Total Hari" value={`${stats.totalDays} hari`} emoji="📅" color="var(--blue)" style={{ ...styles.statCard, borderColor: "var(--blue)30" }} />
            <StatCard label="Streak Sekarang" value={`${stats.currentStreak} hari`} emoji="🔥" color="#ff9f57" style={{ ...styles.statCard, borderColor: "#ff9f5730" }} />
            <StatCard label="Total XP" value={`${stats.totalXP} XP`} emoji="⚡" color="var(--accent)" style={{ ...styles.statCard, borderColor: "var(--accent)30" }} />
            <StatCard
              label="Level"
              value={
                stats.level
                  ? `${stats.level.currentLevel.levelNumber} - ${stats.level.currentLevel.levelName}`
                  : "Level 1"
              }
              emoji="💞"
              color="var(--accent)"
              style={{ ...styles.statCard, borderColor: "var(--accent)30" }}
            />
            <StatCard label="Multiplier" value={`${stats.streakMultiplier ?? 1}x`} emoji="✨" color="#ff9f57" style={{ ...styles.statCard, borderColor: "#ff9f5730" }} />
            <StatCard label="Mood Terbaik" value={`${stats.highestRating}/10`} emoji="👑" color="var(--accent)" style={{ ...styles.statCard, borderColor: "var(--accent)30" }} />
            <StatCard label="Mood Terendah" value={`${stats.lowestRating}/10`} emoji="💙" color="var(--red)" style={{ ...styles.statCard, borderColor: "var(--red)30" }} />
          </div>
        )}

        <div style={styles.tabs}>
          {(["calendar", "notes", "history", "minigames"] as const).map((tab) => (
            <button
              key={tab}
              style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "calendar" && "📆 Calendar"}
              {tab === "notes" && `📝 Notes (${moodsWithNotes.length})`}
              {tab === "history" && "📋 History"}
              {tab === "minigames" && `🎮 Mini-games (${miniGames.length})`}
            </button>
          ))}
        </div>

        {activeTab === "calendar" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Mood Calendar - 12 Minggu Terakhir</h2>
            <CalendarGrid
              days={calendarData}
              getEmoji={getRatingEmoji}
              getCellTitle={(day) =>
                day.rating > 0
                  ? `${day.date}: ${day.rating}/10 ${getRatingEmoji(day.rating)}`
                  : day.date
              }
              cellStyle={(rating) => ({
                background: getRatingBg(rating),
                border: `1px solid ${
                  rating > 0 ? getRatingColor(rating) + "40" : "var(--border)"
                }`,
              })}
            />
            <div style={styles.legend}>
              {LEGEND_DATA.map((item) => (
                <div key={item.label} style={styles.legendItem}>
                  <div
                    style={{
                      ...styles.legendDot,
                      background: item.color + "40",
                      border: `1px solid ${item.color}60`,
                    }}
                  />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "notes" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Catatan Harian</h2>
            <NotesList
              moods={moodsWithNotes}
              getEmoji={getRatingEmoji}
              formatDate={(d) =>
                formatDate(d, "id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              }
              getRatingColor={getRatingColor}
              itemStyle={(mood) => ({
                borderLeft: `3px solid ${getRatingColor(mood.rating)}`,
                background: getRatingBg(mood.rating),
              })}
              emptyMessage="Belum ada catatan yang ditulis."
            />
          </div>
        )}

        {activeTab === "history" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Semua History</h2>
            <HistoryList
              moods={moods}
              getEmoji={getRatingEmoji}
              formatDate={(d) =>
                formatDate(d, "id-ID", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })
              }
              getRatingColor={getRatingColor}
              rowStyle={(mood) => ({ borderBottomColor: getRatingBg(mood.rating) })}
              emptyMessage="Belum ada data mood."
            />
          </div>
        )}

        {activeTab === "minigames" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Mini-game Management</h2>
            <MiniGameForm form={form} setForm={setForm} onSubmit={handleCreateMiniGame} />
            <div style={styles.gameToolbar}>
              <p style={styles.mutedText}>
                Active limit: {miniGames.filter((game) => game.is_active).length}/
                {MAX_ACTIVE_MINI_GAMES}
              </p>
              <button style={styles.backBtn} onClick={fetchMiniGames}>
                Refresh
              </button>
            </div>
            {miniGameMessage && <p style={styles.infoText}>{miniGameMessage}</p>}
            {miniGameLoading ? (
              <LoadingSpinner label="loading mini-games..." />
            ) : (
              <MiniGameList games={miniGames} onUpdate={handleUpdateMiniGame} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniGameForm({
  form,
  setForm,
  onSubmit,
}: {
  form: MiniGameFormState;
  setForm: Dispatch<SetStateAction<MiniGameFormState>>;
  onSubmit: () => void;
}) {
  return (
    <div style={styles.formGrid}>
      <input
        style={styles.input}
        placeholder="Title"
        value={form.title}
        onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
      />
      <textarea
        style={styles.textarea}
        placeholder="Description"
        value={form.description}
        onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
        rows={2}
      />
      <div style={styles.twoColumn}>
        <select
          style={styles.input}
          value={form.type}
          onChange={(e) => setForm((current) => ({ ...current, type: e.target.value }))}
        >
          {MINI_GAME_TYPES.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
        <select
          style={styles.input}
          value={form.difficulty}
          onChange={(e) => setForm((current) => ({ ...current, difficulty: e.target.value }))}
        >
          {MINI_GAME_DIFFICULTIES.map((difficulty) => (
            <option key={difficulty}>{difficulty}</option>
          ))}
        </select>
      </div>
      <div style={styles.twoColumn}>
        <input
          style={styles.input}
          type="number"
          min={0}
          max={200}
          value={form.xp_reward}
          onChange={(e) =>
            setForm((current) => ({ ...current, xp_reward: Number(e.target.value) }))
          }
        />
        <input
          style={styles.input}
          type="date"
          value={form.active_date}
          onChange={(e) => setForm((current) => ({ ...current, active_date: e.target.value }))}
        />
      </div>
      <textarea
        style={styles.textarea}
        placeholder="Question / Prompt"
        value={form.prompt}
        onChange={(e) => setForm((current) => ({ ...current, prompt: e.target.value }))}
        rows={2}
      />
      <textarea
        style={styles.textarea}
        placeholder="Options, satu option per baris"
        value={form.options_json}
        onChange={(e) => setForm((current) => ({ ...current, options_json: e.target.value }))}
        rows={3}
      />
      <input
        style={styles.input}
        placeholder="Correct answer, boleh kosong untuk challenge/reflection"
        value={form.correct_answer}
        onChange={(e) => setForm((current) => ({ ...current, correct_answer: e.target.value }))}
      />
      <label style={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm((current) => ({ ...current, is_active: e.target.checked }))}
        />
        Aktifkan langsung
      </label>
      <button style={styles.primaryButton} onClick={onSubmit}>
        Create Mini-game
      </button>
    </div>
  );
}

function MiniGameList({
  games,
  onUpdate,
}: {
  games: MiniGame[];
  onUpdate: (game: MiniGame, patch: Partial<MiniGame>) => void;
}) {
  if (games.length === 0) {
    return <p style={styles.mutedText}>Belum ada mini-game.</p>;
  }

  return (
    <div style={styles.gameList}>
      {games.map((game) => (
        <div key={game.id} style={styles.gameCard}>
          <div style={styles.gameHeader}>
            <div>
              <p style={styles.gameMeta}>
                {game.type} · {game.difficulty} · +{game.xp_reward} XP
              </p>
              <h3 style={styles.gameTitle}>{game.title}</h3>
              {game.prompt && <p style={styles.mutedText}>{game.prompt}</p>}
            </div>
            <button
              style={game.is_active ? styles.dangerButton : styles.primaryButtonCompact}
              onClick={() => onUpdate(game, { is_active: !game.is_active })}
            >
              {game.is_active ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  centerPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg)",
  },
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(ellipse at 50% -10%, rgba(87,184,255,0.05) 0%, transparent 50%)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "20px 24px",
    borderBottom: "1px solid var(--border)",
  },
  headerTop: { display: "flex", alignItems: "center", gap: 10, marginBottom: 4 },
  logo: {
    fontFamily: "Syne, sans-serif",
    fontWeight: 800,
    fontSize: 18,
    color: "var(--accent)",
  },
  adminBadge: {
    background: "rgba(87,184,255,0.15)",
    color: "var(--blue)",
    border: "1px solid rgba(87,184,255,0.3)",
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
  },
  headerSub: { fontSize: 13, color: "var(--text-muted)" },
  backBtn: {
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--text-muted)",
    borderRadius: 8,
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "DM Sans, sans-serif",
  },
  container: {
    maxWidth: 860,
    margin: "0 auto",
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
  },
  statCard: {
    background: "var(--surface)",
    border: "1px solid",
    borderRadius: 12,
    padding: "14px 16px",
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  tabs: {
    display: "flex",
    gap: 8,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 6,
    overflowX: "auto",
  },
  tab: {
    flex: 1,
    minWidth: 120,
    padding: "10px",
    border: "none",
    borderRadius: 8,
    background: "transparent",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
    fontSize: 13,
    fontWeight: 500,
  },
  tabActive: {
    background: "var(--surface2)",
    color: "var(--text)",
    fontWeight: 600,
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 24,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Syne, sans-serif",
    fontWeight: 700,
    marginBottom: 20,
  },
  legend: { display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "var(--text-muted)",
  },
  legendDot: { width: 14, height: 14, borderRadius: 4 },
  formGrid: { display: "grid", gap: 10 },
  twoColumn: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--surface2)",
    color: "var(--text)",
    fontFamily: "DM Sans, sans-serif",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--surface2)",
    color: "var(--text)",
    fontFamily: "DM Sans, sans-serif",
    resize: "vertical",
  },
  checkboxLabel: { display: "flex", gap: 8, alignItems: "center", fontSize: 13 },
  primaryButton: {
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    background: "var(--accent)",
    color: "#210d18",
    fontWeight: 800,
    cursor: "pointer",
  },
  primaryButtonCompact: {
    border: "none",
    borderRadius: 10,
    padding: "9px 12px",
    background: "var(--accent)",
    color: "#210d18",
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  dangerButton: {
    border: "none",
    borderRadius: 10,
    padding: "9px 12px",
    background: "var(--red)",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  gameToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    margin: "22px 0 12px",
  },
  infoText: { color: "var(--accent)", fontSize: 13, marginBottom: 12 },
  mutedText: { color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 },
  gameList: { display: "grid", gap: 10 },
  gameCard: {
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 14,
    background: "var(--surface2)",
  },
  gameHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  gameMeta: { fontSize: 11, color: "var(--text-muted)", marginBottom: 4 },
  gameTitle: { fontFamily: "Syne, sans-serif", fontSize: 15, marginBottom: 6 },
};
