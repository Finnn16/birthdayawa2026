"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { useAdminData } from "@/app/hooks/useAdminData";
import {
  MAX_ACTIVE_MINI_GAMES,
  MINI_GAME_DIFFICULTIES,
  MINI_GAME_TYPES,
} from "@/lib/app-config";
import {
  buildCalendarData,
  formatDate,
  getMoodsWithNotes,
} from "@/lib/calendar-utils";
import {
  getRatingBg,
  getRatingColor,
  getRatingEmoji,
  LEGEND_DATA,
} from "@/lib/admin-theme";
import { COUPLE_EVENT_TYPES } from "@/lib/couple-events";
import { type MiniGame } from "@/lib/minigames";
import { CalendarGrid } from "@/components/common/CalendarGrid";
import { NotesList } from "@/components/common/NotesList";
import { StatCard } from "@/components/common/StatCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";

type AdminTab =
  | "notes"
  | "minigames"
  | "rewards"
  | "redemptions"
  | "questBank"
  | "questAssignments"
  | "hearts"
  | "inventory"
  | "coupleCalendar"
  | "hero"
  | "streakProtection";

type MiniGameFormState = {
  title: string;
  description: string;
  type: string;
  difficulty: string;
  xp_reward: number;
  hearts_reward: number;
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
  hearts_reward: 5,
  active_date: new Date().toISOString().split("T")[0],
  is_active: false,
  prompt: "",
  options_json: "",
  correct_answer: "",
});

const emptyRewardForm = () => ({
  title: "",
  description: "",
  cost_hearts: 25,
  category: "experience",
  is_active: true,
});

const emptyQuestForm = () => ({
  title: "",
  description: "",
  type: "reflection",
  difficulty: "easy",
  xp_reward: 8,
  hearts_reward: 3,
  prompt: "",
  options_json: "",
  correct_answer: "",
  is_active: true,
});

const emptyEventForm = () => ({
  title: "",
  description: "",
  event_date: new Date().toISOString().split("T")[0],
  event_type: "custom",
  visibility: "both",
  is_special: false,
  is_active: true,
});

const emptyHeroForm = () => ({
  title: "Jaga mood, kumpulin Hearts, dan rawat garden pelan-pelan.",
  body: "Hari ini cukup isi mood dulu. Quest dan reward bisa menyusul setelahnya.",
  tone: "soft",
  active_date: "",
  is_active: true,
});

const adminSections: Array<{ id: AdminTab; label: string; icon: string }> = [
  { id: "notes", label: "Moods", icon: "📆" },
  { id: "minigames", label: "Mini-games", icon: "🎮" },
  { id: "rewards", label: "Rewards", icon: "🎁" },
  { id: "redemptions", label: "Redemptions", icon: "✅" },
  { id: "questBank", label: "Quest Bank", icon: "💌" },
  { id: "questAssignments", label: "Quest Assign", icon: "🗓️" },
  { id: "hearts", label: "Hearts", icon: "💗" },
  { id: "inventory", label: "Inventory", icon: "🛡️" },
  { id: "coupleCalendar", label: "Couple Calendar", icon: "🌙" },
  { id: "hero", label: "Hero Copy", icon: "✨" },
  { id: "streakProtection", label: "Streak Requests", icon: "🔥" },
];

async function readJsonResponse(res: Response) {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: `Server mengembalikan response non-JSON (${res.status}).`,
      details: text.slice(0, 180),
    };
  }
}

export default function AdminDashboard() {
  const router = useRouter();
  const { moods, stats, userInfo, loading, error } = useAdminData();
  const [activeTab, setActiveTab] = useState<AdminTab>("notes");
  const [miniGames, setMiniGames] = useState<MiniGame[]>([]);
  const [miniGameLoading, setMiniGameLoading] = useState(false);
  const [miniGameMessage, setMiniGameMessage] = useState("");
  const [form, setForm] = useState<MiniGameFormState>(emptyForm);
  const [engagementMessage, setEngagementMessage] = useState("");
  const [rewards, setRewards] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [questBank, setQuestBank] = useState<any[]>([]);
  const [coupleEvents, setCoupleEvents] = useState<any[]>([]);
  const [heroMessages, setHeroMessages] = useState<any[]>([]);
  const [streakRequests, setStreakRequests] = useState<any[]>([]);
  const [rewardForm, setRewardForm] = useState(emptyRewardForm);
  const [questForm, setQuestForm] = useState(emptyQuestForm);
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [heroForm, setHeroForm] = useState(emptyHeroForm);
  const [heroEditingId, setHeroEditingId] = useState<string | null>(null);
  const [heartGrant, setHeartGrant] = useState({ amount: 10, note: "" });
  const [inventoryGrant, setInventoryGrant] = useState({
    item_type: "forgiveness_ticket",
    quantity: 1,
  });

  const calendarData = useMemo(() => buildCalendarData(moods), [moods]);
  const moodsWithNotes = useMemo(() => getMoodsWithNotes(moods), [moods]);
  const activeMeta =
    adminSections.find((section) => section.id === activeTab) ??
    adminSections[0];
  const sectionCounts: Record<AdminTab, number> = {
    notes: moods.length,
    minigames: miniGames.length,
    rewards: rewards.length,
    redemptions: redemptions.filter((item) => item.status === "pending").length,
    questBank: questBank.length,
    questAssignments: questBank.filter((quest) => quest.is_active).length,
    hearts: 0,
    inventory: 0,
    coupleCalendar: coupleEvents.length,
    hero: heroMessages.length,
    streakProtection: streakRequests.filter((item) => item.status === "pending")
      .length,
  };

  const fetchMiniGames = useCallback(async () => {
    setMiniGameLoading(true);
    try {
      const res = await fetch("/api/admin/minigames");
      const json = await readJsonResponse(res);
      setMiniGames(json.minigames ?? []);
      setMiniGameMessage(json.message ?? json.error ?? json.details ?? "");
    } catch (error) {
      setMiniGames([]);
      setMiniGameMessage(
        error instanceof Error ? error.message : "Gagal memuat mini-game.",
      );
    } finally {
      setMiniGameLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "minigames") {
      fetchMiniGames();
    }
    if (
      (
        [
          "rewards",
          "redemptions",
          "questBank",
          "questAssignments",
          "coupleCalendar",
        ] as AdminTab[]
      ).includes(activeTab)
    ) {
      fetchAdminEngagement();
    }
    if (activeTab === "hero") {
      fetchHeroMessages();
    }
    if (activeTab === "streakProtection") {
      fetchStreakProtectionRequests();
    }
  }, [activeTab, fetchMiniGames]);

  async function fetchHeroMessages() {
    const res = await fetch("/api/admin/hero-messages");
    const json = await readJsonResponse(res);
    setHeroMessages(json.heroMessages ?? []);
    setEngagementMessage(json.error ?? json.details ?? "");
  }

  async function fetchStreakProtectionRequests() {
    const res = await fetch("/api/admin/streak-protection");
    const json = await readJsonResponse(res);
    setStreakRequests(json.requests ?? []);
    setEngagementMessage(json.error ?? json.details ?? "");
  }

  async function fetchAdminEngagement() {
    const [rewardsRes, redemptionsRes, questRes, eventsRes] = await Promise.all(
      [
        fetch("/api/admin/rewards"),
        fetch("/api/admin/reward-redemptions"),
        fetch("/api/admin/daily-quest-bank"),
        fetch("/api/admin/couple-events"),
      ],
    );
    const [rewardsJson, redemptionsJson, questJson, eventsJson] =
      await Promise.all([
        readJsonResponse(rewardsRes),
        readJsonResponse(redemptionsRes),
        readJsonResponse(questRes),
        readJsonResponse(eventsRes),
      ]);
    setRewards(rewardsJson.rewards ?? []);
    setRedemptions(redemptionsJson.redemptions ?? []);
    setQuestBank(questJson.quests ?? []);
    setCoupleEvents(eventsJson.events ?? []);
    setEngagementMessage(
      rewardsJson.error ??
        redemptionsJson.error ??
        questJson.error ??
        eventsJson.error ??
        "",
    );
  }

  async function handleCreateMiniGame() {
    setMiniGameMessage("");
    const res = await fetch("/api/admin/minigames", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await readJsonResponse(res);

    if (!res.ok) {
      setMiniGameMessage(
        json.details ?? json.error ?? "Gagal membuat mini-game.",
      );
      return;
    }

    setMiniGameMessage("Mini-game berhasil dibuat.");
    setForm(emptyForm());
    fetchMiniGames();
  }

  async function handleUpdateMiniGame(
    game: MiniGame,
    patch: Partial<MiniGame>,
  ) {
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
        hearts_reward: game.hearts_reward ?? 0,
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
    const json = await readJsonResponse(res);

    if (!res.ok) {
      setMiniGameMessage(
        json.details ?? json.error ?? "Gagal update mini-game.",
      );
      return;
    }

    setMiniGameMessage("Mini-game berhasil diupdate.");
    fetchMiniGames();
  }

  async function handleDeleteResource(
    endpoint: string,
    label: string,
    refresh: () => void | Promise<void>,
    setMessage: Dispatch<SetStateAction<string>> = setEngagementMessage,
  ) {
    const confirmed = window.confirm(
      `Hapus ${label}? Aksi ini tidak bisa di-undo.`,
    );
    if (!confirmed) return;

    const res = await fetch(endpoint, { method: "DELETE" });
    const json = await readJsonResponse(res);
    setMessage(
      res.ok
        ? `${label} berhasil dihapus.`
        : (json.details ?? json.error ?? `Gagal menghapus ${label}.`),
    );
    if (res.ok) await refresh();
  }

  async function handleCreateReward() {
    const res = await fetch("/api/admin/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rewardForm),
    });
    const json = await readJsonResponse(res);
    setEngagementMessage(
      res.ok
        ? "Reward berhasil dibuat."
        : (json.details ?? json.error ?? "Gagal membuat reward."),
    );
    if (res.ok) {
      setRewardForm(emptyRewardForm());
      fetchAdminEngagement();
    }
  }

  async function handleToggleReward(reward: any) {
    const res = await fetch(`/api/admin/rewards/${reward.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !reward.is_active }),
    });
    const json = await readJsonResponse(res);
    setEngagementMessage(
      res.ok
        ? "Reward berhasil diupdate."
        : (json.details ?? json.error ?? "Gagal update reward."),
    );
    fetchAdminEngagement();
  }

  async function handleRedemptionStatus(redemption: any, status: string) {
    const res = await fetch(`/api/admin/reward-redemptions/${redemption.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await readJsonResponse(res);
    setEngagementMessage(
      res.ok
        ? `Redemption ${status}.`
        : (json.details ?? json.error ?? "Gagal update redemption."),
    );
    fetchAdminEngagement();
  }

  async function handleCreateQuest() {
    const res = await fetch("/api/admin/daily-quest-bank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(questForm),
    });
    const json = await readJsonResponse(res);
    setEngagementMessage(
      res.ok
        ? "Quest berhasil dibuat."
        : (json.details ?? json.error ?? "Gagal membuat quest."),
    );
    if (res.ok) {
      setQuestForm(emptyQuestForm());
      fetchAdminEngagement();
    }
  }

  async function handleToggleQuest(quest: any) {
    const res = await fetch(`/api/admin/daily-quest-bank/${quest.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !quest.is_active }),
    });
    const json = await readJsonResponse(res);
    setEngagementMessage(
      res.ok
        ? "Quest berhasil diupdate."
        : (json.details ?? json.error ?? "Gagal update quest."),
    );
    fetchAdminEngagement();
  }

  async function handleAssignQuest(questId: string) {
    const res = await fetch("/api/admin/daily-quest-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quest_id: questId,
        active_date: new Date().toISOString().split("T")[0],
      }),
    });
    const json = await readJsonResponse(res);
    setEngagementMessage(
      res.ok
        ? "Quest berhasil diassign hari ini."
        : (json.details ?? json.error ?? "Gagal assign quest."),
    );
    fetchAdminEngagement();
  }

  async function handleAutoPickQuest() {
    const res = await fetch("/api/admin/daily-quest-assignments/auto-pick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 3 }),
    });
    const json = await readJsonResponse(res);
    setEngagementMessage(
      res.ok
        ? "Auto-pick quest berhasil."
        : (json.details ?? json.error ?? "Gagal auto-pick quest."),
    );
    fetchAdminEngagement();
  }

  async function handleGrantHearts() {
    const res = await fetch("/api/admin/hearts/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(heartGrant),
    });
    const json = await readJsonResponse(res);
    setEngagementMessage(
      res.ok
        ? "Hearts berhasil dikirim."
        : (json.details ?? json.error ?? "Gagal grant Hearts."),
    );
  }

  async function handleGrantInventory() {
    const res = await fetch("/api/admin/inventory/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inventoryGrant),
    });
    const json = await readJsonResponse(res);
    setEngagementMessage(
      res.ok
        ? "Inventory berhasil dikirim."
        : (json.details ?? json.error ?? "Gagal grant inventory."),
    );
  }

  async function handleCreateEvent() {
    const res = await fetch("/api/admin/couple-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventForm),
    });
    const json = await readJsonResponse(res);
    setEngagementMessage(
      res.ok
        ? "Event berhasil dibuat."
        : (json.details ?? json.error ?? "Gagal membuat event."),
    );
    if (res.ok) {
      setEventForm(emptyEventForm());
      fetchAdminEngagement();
    }
  }

  async function handleToggleEvent(event: any) {
    const res = await fetch(`/api/admin/couple-events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !event.is_active }),
    });
    const json = await readJsonResponse(res);
    setEngagementMessage(
      res.ok
        ? "Event berhasil diupdate."
        : (json.details ?? json.error ?? "Gagal update event."),
    );
    fetchAdminEngagement();
  }

  async function handleSaveHeroMessage() {
    const res = await fetch(
      heroEditingId
        ? `/api/admin/hero-messages/${heroEditingId}`
        : "/api/admin/hero-messages",
      {
        method: heroEditingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(heroForm),
      },
    );
    const json = await readJsonResponse(res);
    setEngagementMessage(
      res.ok
        ? heroEditingId
          ? "Hero message berhasil disimpan."
          : "Hero message berhasil dipublish."
        : (json.details ?? json.error ?? "Gagal menyimpan hero message."),
    );
    if (res.ok) {
      setHeroEditingId(null);
      setHeroForm(emptyHeroForm());
      fetchHeroMessages();
    }
  }

  function handleEditHeroMessage(message: any) {
    setHeroEditingId(message.id);
    setHeroForm({
      title: message.title ?? "",
      body: message.body ?? "",
      tone: message.tone ?? "soft",
      active_date:
        typeof message.active_date === "string"
          ? message.active_date.slice(0, 10)
          : "",
      is_active: Boolean(message.is_active),
    });
    setEngagementMessage("Sedang edit hero message. Simpan untuk update dashboard user.");
  }

  function handleCancelHeroEdit() {
    setHeroEditingId(null);
    setHeroForm(emptyHeroForm());
    setEngagementMessage("");
  }

  async function handleToggleHeroMessage(message: any) {
    const res = await fetch(`/api/admin/hero-messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !message.is_active }),
    });
    const json = await readJsonResponse(res);
    setEngagementMessage(
      res.ok
        ? "Hero message berhasil diupdate."
        : (json.details ?? json.error ?? "Gagal update hero message."),
    );
    fetchHeroMessages();
  }

  async function handleStreakProtectionStatus(
    request: any,
    status: "approved" | "rejected",
  ) {
    const res = await fetch(`/api/admin/streak-protection/${request.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await readJsonResponse(res);
    setEngagementMessage(
      res.ok
        ? `Streak protection ${status}.`
        : (json.details ?? json.error ?? "Gagal update streak protection."),
    );
    fetchStreakProtectionRequests();
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
        <p style={{ color: "var(--red)", fontFamily: "Syne, sans-serif" }}>
          {error}
        </p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <span style={styles.brandIcon}>💞</span>
          <div>
            <strong style={styles.brandTitle}>BirthdayAwa</strong>
            <small style={styles.brandSubtitle}>Admin Studio</small>
          </div>
        </div>

        <nav style={styles.nav} aria-label="Admin sections">
          {adminSections.map((section) => (
            <button
              key={section.id}
              type="button"
              style={{
                ...styles.navItem,
                ...(activeTab === section.id ? styles.navActive : {}),
              }}
              onClick={() => setActiveTab(section.id)}
            >
              <span style={styles.navIcon}>{section.icon}</span>
              <strong>{section.label}</strong>
              <em style={styles.navCount}>{sectionCounts[section.id]}</em>
            </button>
          ))}
        </nav>
      </aside>

      <div style={styles.header}>
        <div>
          <div style={styles.headerTop}>
            <span style={styles.logo}>💗 BirthdayAwa</span>
            <span style={styles.adminBadge}>ADMIN</span>
          </div>
          <p style={styles.eyebrow}>Content cockpit</p>
          <h1 style={styles.pageTitle}>{activeMeta.label}</h1>
          <p style={styles.headerSub}>
            Dashboard mood untuk{" "}
            <strong style={{ color: "var(--accent)" }}>
              @{userInfo?.username ?? "..."}
            </strong>
          </p>
        </div>
        <button
          type="button"
          style={styles.iconAction}
          onClick={() => router.push("/dashboard")}
          aria-label="Balik ke dashboard user"
          title="Balik ke dashboard user"
        >
          ↩️
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
              style={{
                ...styles.statCard,
                borderColor: getRatingColor(Math.round(stats.avgRating)) + "30",
              }}
            />
            <StatCard
              label="Total Hari"
              value={`${stats.totalDays} hari`}
              emoji="📅"
              color="var(--blue)"
              style={{ ...styles.statCard, borderColor: "var(--blue)30" }}
            />
            <StatCard
              label="Streak Sekarang"
              value={`${stats.currentStreak} hari`}
              emoji="🔥"
              color="#ff9f57"
              style={{ ...styles.statCard, borderColor: "#ff9f5730" }}
            />
            <StatCard
              label="Total XP"
              value={`${stats.totalXP} XP`}
              emoji="⚡"
              color="var(--accent)"
              style={{ ...styles.statCard, borderColor: "var(--accent)30" }}
            />
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
            <StatCard
              label="Multiplier"
              value={`${stats.streakMultiplier ?? 1}x`}
              emoji="✨"
              color="#ff9f57"
              style={{ ...styles.statCard, borderColor: "#ff9f5730" }}
            />
            <StatCard
              label="Mood Terbaik"
              value={`${stats.highestRating}/10`}
              emoji="👑"
              color="var(--accent)"
              style={{ ...styles.statCard, borderColor: "var(--accent)30" }}
            />
            <StatCard
              label="Mood Terendah"
              value={`${stats.lowestRating}/10`}
              emoji="💙"
              color="var(--red)"
              style={{ ...styles.statCard, borderColor: "var(--red)30" }}
            />
          </div>
        )}

        <div style={styles.tabs}>
          {(
            [
              "notes",
              "minigames",
              "rewards",
              "redemptions",
              "questBank",
              "questAssignments",
              "hearts",
              "inventory",
              "coupleCalendar",
              "hero",
              "streakProtection",
            ] as const
          ).map((tab) => (
            <button
              key={tab}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "notes" && `📆 Moods (${moods.length})`}
              {tab === "minigames" && `🎮 Mini-games (${miniGames.length})`}
              {tab === "rewards" && `Rewards (${rewards.length})`}
              {tab === "redemptions" && `Redemptions (${redemptions.length})`}
              {tab === "questBank" && `Quest Bank (${questBank.length})`}
              {tab === "questAssignments" && "Quest Assign"}
              {tab === "hearts" && "Hearts"}
              {tab === "inventory" && "Inventory"}
              {tab === "coupleCalendar" && `Calendar (${coupleEvents.length})`}
              {tab === "hero" && `Hero (${heroMessages.length})`}
              {tab === "streakProtection" &&
                `Streak (${streakRequests.filter((item) => item.status === "pending").length})`}
            </button>
          ))}
        </div>

        {activeTab === "notes" && (
          <div style={styles.moodPanelStack}>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                Mood Calendar - 12 Minggu Terakhir
              </h2>
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

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Mood Notes</h2>
              <div style={styles.notesScroll}>
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
            </div>
          </div>
        )}

        {activeTab === "minigames" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Mini-game Management</h2>
            <MiniGameForm
              form={form}
              setForm={setForm}
              onSubmit={handleCreateMiniGame}
            />
            <div style={styles.gameToolbar}>
              <p style={styles.mutedText}>
                Active limit:{" "}
                {miniGames.filter((game) => game.is_active).length}/
                {MAX_ACTIVE_MINI_GAMES}
              </p>
              <button style={styles.backBtn} onClick={fetchMiniGames}>
                Refresh
              </button>
            </div>
            {miniGameMessage && (
              <p style={styles.infoText}>{miniGameMessage}</p>
            )}
            {miniGameLoading ? (
              <LoadingSpinner label="loading mini-games..." />
            ) : (
              <MiniGameList
                games={miniGames}
                onUpdate={handleUpdateMiniGame}
                onDelete={(game) =>
                  handleDeleteResource(
                    `/api/admin/minigames/${game.id}`,
                    game.title,
                    fetchMiniGames,
                    setMiniGameMessage,
                  )
                }
              />
            )}
          </div>
        )}

        {activeTab === "rewards" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Reward Shop Admin</h2>
            <AdminRewardForm
              form={rewardForm}
              setForm={setRewardForm}
              onSubmit={handleCreateReward}
            />
            {engagementMessage && (
              <p style={styles.infoText}>{engagementMessage}</p>
            )}
            <SimpleList
              items={rewards}
              empty="Belum ada reward."
              render={(reward) => (
                <div style={styles.gameHeader}>
                  <div>
                    <p style={styles.gameMeta}>
                      {reward.category} · {reward.cost_hearts} Hearts ·{" "}
                      {reward.is_active ? "active" : "inactive"}
                    </p>
                    <h3 style={styles.gameTitle}>{reward.title}</h3>
                    <p style={styles.mutedText}>{reward.description}</p>
                  </div>
                  <div style={styles.inlineActions}>
                    <button
                      style={styles.primaryButtonCompact}
                      onClick={() => handleToggleReward(reward)}
                    >
                      {reward.is_active ? "Deactivate" : "Activate"}
                    </button>
                    {!reward.is_active && (
                      <button
                        type="button"
                        style={styles.iconActionSmall}
                        onClick={() =>
                          handleDeleteResource(
                            `/api/admin/rewards/${reward.id}`,
                            reward.title,
                            fetchAdminEngagement,
                          )
                        }
                        aria-label={`Hapus ${reward.title}`}
                        title="Hapus"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {activeTab === "redemptions" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Reward Redemptions</h2>
            {engagementMessage && (
              <p style={styles.infoText}>{engagementMessage}</p>
            )}
            <SimpleList
              items={redemptions}
              empty="Belum ada redemption."
              render={(redemption) => (
                <div>
                  <p style={styles.gameMeta}>
                    {redemption.users?.username ??
                      redemption.users?.email ??
                      "User"}{" "}
                    · {redemption.status} · {redemption.cost_hearts} Hearts
                  </p>
                  <h3 style={styles.gameTitle}>
                    {redemption.rewards?.title ?? "Reward"}
                  </h3>
                  <div style={styles.inlineActions}>
                    {[
                      { status: "approved", icon: "✅" },
                      { status: "rejected", icon: "❌" },
                      { status: "fulfilled", icon: "🎁" },
                      { status: "cancelled", icon: "↩️" },
                    ].map((action) => (
                      <button
                        key={action.status}
                        type="button"
                        style={styles.iconActionSmall}
                        onClick={() =>
                          handleRedemptionStatus(redemption, action.status)
                        }
                        aria-label={`${action.status} redemption`}
                        title={action.status}
                      >
                        {action.icon}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {activeTab === "questBank" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Daily Quest Bank</h2>
            <AdminQuestForm
              form={questForm}
              setForm={setQuestForm}
              onSubmit={handleCreateQuest}
            />
            {engagementMessage && (
              <p style={styles.infoText}>{engagementMessage}</p>
            )}
            <SimpleList
              items={questBank}
              empty="Belum ada quest."
              render={(quest) => (
                <div style={styles.gameHeader}>
                  <div>
                    <p style={styles.gameMeta}>
                      {quest.type} · {quest.difficulty} · used:{" "}
                      {quest.used ? quest.last_used_date : "never"}
                    </p>
                    <h3 style={styles.gameTitle}>{quest.title}</h3>
                    <p style={styles.mutedText}>{quest.prompt}</p>
                  </div>
                  <div style={styles.inlineActions}>
                    <button
                      style={styles.primaryButtonCompact}
                      onClick={() => handleToggleQuest(quest)}
                    >
                      {quest.is_active ? "Deactivate" : "Activate"}
                    </button>
                    {!quest.is_active && (
                      <button
                        type="button"
                        style={styles.iconActionSmall}
                        onClick={() =>
                          handleDeleteResource(
                            `/api/admin/daily-quest-bank/${quest.id}`,
                            quest.title,
                            fetchAdminEngagement,
                          )
                        }
                        aria-label={`Hapus ${quest.title}`}
                        title="Hapus"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {activeTab === "questAssignments" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Quest Assignment</h2>
            <button style={styles.primaryButton} onClick={handleAutoPickQuest}>
              Auto-pick 3 Quest Hari Ini
            </button>
            {engagementMessage && (
              <p style={styles.infoText}>{engagementMessage}</p>
            )}
            <SimpleList
              items={questBank.filter((quest) => quest.is_active)}
              empty="Belum ada quest aktif."
              render={(quest) => (
                <div style={styles.gameHeader}>
                  <div>
                    <p
                      style={
                        quest.assigned_today
                          ? styles.assignedTodayBadge
                          : styles.gameMeta
                      }
                    >
                      {quest.assigned_today ? "Assigned today" : "Ready to assign"}
                    </p>
                    <h3 style={styles.gameTitle}>{quest.title}</h3>
                    <p style={styles.mutedText}>
                      {quest.last_used_date
                        ? `Last used ${quest.last_used_date}`
                        : "Unused"}
                    </p>
                  </div>
                  <button
                    style={
                      quest.assigned_today
                        ? styles.disabledButtonCompact
                        : styles.primaryButtonCompact
                    }
                    disabled={quest.assigned_today}
                    onClick={() => handleAssignQuest(quest.id)}
                  >
                    {quest.assigned_today ? "Assigned" : "Assign Today"}
                  </button>
                </div>
              )}
            />
          </div>
        )}

        {activeTab === "hearts" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Grant Hearts</h2>
            <FormIntro
              title="Kirim Hearts manual"
              body="Pakai ini untuk bonus kecil, refund manual, atau hadiah yang tidak berasal dari quest."
            />
            <div style={styles.formGrid}>
              <div style={styles.twoColumn}>
                <Field
                  label="Jumlah Hearts"
                  hint="Angka positif untuk menambah balance user."
                >
                  <input
                    style={styles.input}
                    type="number"
                    min={1}
                    value={heartGrant.amount}
                    onChange={(e) =>
                      setHeartGrant((current) => ({
                        ...current,
                        amount: Number(e.target.value),
                      }))
                    }
                  />
                </Field>
                <Field
                  label="Catatan admin"
                  hint="Opsional, tampil sebagai alasan transaksi."
                >
                  <input
                    style={styles.input}
                    placeholder="Bonus kecil dari admin"
                    value={heartGrant.note}
                    onChange={(e) =>
                      setHeartGrant((current) => ({
                        ...current,
                        note: e.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
              <div style={styles.formActions}>
                <button
                  style={styles.primaryButton}
                  onClick={handleGrantHearts}
                >
                  Grant Hearts
                </button>
              </div>
            </div>
            {engagementMessage && (
              <p style={styles.infoText}>{engagementMessage}</p>
            )}
          </div>
        )}

        {activeTab === "inventory" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Grant Streak Protection</h2>
            <FormIntro
              title="Tambah item perlindungan streak"
              body="Item ini bisa dipakai user untuk request pemulihan streak, tetap perlu approval admin."
            />
            <div style={styles.formGrid}>
              <div style={styles.twoColumn}>
                <Field
                  label="Jenis item"
                  hint="Forgiveness untuk recover, Shield untuk proteksi."
                >
                  <select
                    style={styles.input}
                    value={inventoryGrant.item_type}
                    onChange={(e) =>
                      setInventoryGrant((current) => ({
                        ...current,
                        item_type: e.target.value,
                      }))
                    }
                  >
                    <option value="forgiveness_ticket">
                      Forgiveness Ticket
                    </option>
                    <option value="streak_shield">Streak Shield</option>
                  </select>
                </Field>
                <Field
                  label="Quantity"
                  hint="Jumlah item yang ditambahkan ke inventory user."
                >
                  <input
                    style={styles.input}
                    type="number"
                    min={1}
                    value={inventoryGrant.quantity}
                    onChange={(e) =>
                      setInventoryGrant((current) => ({
                        ...current,
                        quantity: Number(e.target.value),
                      }))
                    }
                  />
                </Field>
              </div>
              <div style={styles.formActions}>
                <button
                  style={styles.primaryButton}
                  onClick={handleGrantInventory}
                >
                  Grant Item
                </button>
              </div>
            </div>
            {engagementMessage && (
              <p style={styles.infoText}>{engagementMessage}</p>
            )}
          </div>
        )}

        {activeTab === "coupleCalendar" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Couple Calendar Events</h2>
            <AdminEventForm
              form={eventForm}
              setForm={setEventForm}
              onSubmit={handleCreateEvent}
            />
            {engagementMessage && (
              <p style={styles.infoText}>{engagementMessage}</p>
            )}
            <SimpleList
              items={coupleEvents}
              empty="Belum ada event."
              render={(event) => (
                <div style={styles.gameHeader}>
                  <div>
                    <p style={styles.gameMeta}>
                      {event.event_date} · {event.event_type} ·{" "}
                      {event.visibility} ·{" "}
                      {event.is_active ? "active" : "inactive"}
                    </p>
                    <h3 style={styles.gameTitle}>{event.title}</h3>
                    <p style={styles.mutedText}>{event.description}</p>
                  </div>
                  <div style={styles.inlineActions}>
                    <button
                      style={styles.primaryButtonCompact}
                      onClick={() => handleToggleEvent(event)}
                    >
                      {event.is_active ? "Deactivate" : "Activate"}
                    </button>
                    {!event.is_active && (
                      <button
                        type="button"
                        style={styles.iconActionSmall}
                        onClick={() =>
                          handleDeleteResource(
                            `/api/admin/couple-events/${event.id}`,
                            event.title,
                            fetchAdminEngagement,
                          )
                        }
                        aria-label={`Hapus ${event.title}`}
                        title="Hapus"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {activeTab === "hero" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Dashboard Hero Copy</h2>
            <AdminHeroForm
              form={heroForm}
              setForm={setHeroForm}
              isEditing={Boolean(heroEditingId)}
              onCancel={handleCancelHeroEdit}
              onSubmit={handleSaveHeroMessage}
            />
            {engagementMessage && (
              <p style={styles.infoText}>{engagementMessage}</p>
            )}
            <SimpleList
              items={heroMessages}
              empty="Belum ada hero message."
              render={(message) => (
                <div style={styles.gameHeader}>
                  <div>
                    <p style={styles.gameMeta}>
                      {message.tone} ·{" "}
                      {message.is_active ? "active" : "inactive"} ·{" "}
                      {message.active_date ?? "default"}
                    </p>
                    <h3 style={styles.gameTitle}>{message.title}</h3>
                    <p style={styles.gameMeta}>{message.body}</p>
                  </div>
                  <div style={styles.inlineActions}>
                    <button
                      type="button"
                      style={styles.secondaryButtonCompact}
                      onClick={() => handleEditHeroMessage(message)}
                    >
                      Edit
                    </button>
                    <button
                      style={styles.primaryButtonCompact}
                      onClick={() => handleToggleHeroMessage(message)}
                    >
                      {message.is_active ? "Deactivate" : "Activate"}
                    </button>
                    {!message.is_active && (
                      <button
                        type="button"
                        style={styles.iconActionSmall}
                        onClick={() =>
                          handleDeleteResource(
                            `/api/admin/hero-messages/${message.id}`,
                            message.title,
                            fetchHeroMessages,
                          )
                        }
                        aria-label={`Hapus ${message.title}`}
                        title="Hapus"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {activeTab === "streakProtection" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Streak Protection Requests</h2>
            {engagementMessage && (
              <p style={styles.infoText}>{engagementMessage}</p>
            )}
            <SimpleList
              items={streakRequests}
              empty="Belum ada request streak protection."
              render={(request) => (
                <div style={styles.gameHeader}>
                  <div>
                    <p style={styles.gameMeta}>
                      {request.users?.username ??
                        request.users?.email ??
                        "User"}{" "}
                      · {request.status} · {request.protected_date}
                    </p>
                    <h3 style={styles.gameTitle}>{request.item_type}</h3>
                    <p style={styles.mutedText}>
                      Last streak: {request.previous_streak_day ?? 0} hari
                      {request.reason ? ` · ${request.reason}` : ""}
                    </p>
                  </div>
                  {request.status === "pending" && (
                    <div style={styles.inlineActions}>
                      <button
                        type="button"
                        style={styles.iconActionSmall}
                        onClick={() =>
                          handleStreakProtectionStatus(request, "approved")
                        }
                        aria-label="Approve streak protection"
                        title="Approve"
                      >
                        ✅
                      </button>
                      <button
                        type="button"
                        style={styles.iconActionSmall}
                        onClick={() =>
                          handleStreakProtectionStatus(request, "rejected")
                        }
                        aria-label="Reject streak protection"
                        title="Reject"
                      >
                        ❌
                      </button>
                    </div>
                  )}
                </div>
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function FormIntro({ title, body }: { title: string; body: string }) {
  return (
    <div style={styles.formIntro}>
      <strong style={styles.formIntroTitle}>{title}</strong>
      <p style={styles.formIntroText}>{body}</p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      {children}
      {hint && <small style={styles.fieldHint}>{hint}</small>}
    </label>
  );
}

function CheckboxField({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label style={styles.checkboxCard}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <strong style={styles.checkboxTitle}>{label}</strong>
        <small style={styles.checkboxHint}>{hint}</small>
      </span>
    </label>
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
      <FormIntro
        title="Buat mini-game harian"
        body="Mini-game memberi XP dan Hearts hanya saat user menyelesaikan challenge. Aktifkan maksimal sesuai limit harian."
      />
      <Field
        label="Judul mini-game"
        hint="Tampil sebagai nama kartu di dashboard user."
      >
        <input
          style={styles.input}
          placeholder="Guess the date"
          value={form.title}
          onChange={(e) =>
            setForm((current) => ({ ...current, title: e.target.value }))
          }
        />
      </Field>
      <Field
        label="Deskripsi"
        hint="Kalimat pendek untuk memberi konteks sebelum user menjawab."
      >
        <textarea
          style={styles.textarea}
          placeholder="Tebak momen kecil yang pernah kita obrolin."
          value={form.description}
          onChange={(e) =>
            setForm((current) => ({ ...current, description: e.target.value }))
          }
          rows={2}
        />
      </Field>
      <div style={styles.twoColumn}>
        <Field
          label="Tipe game"
          hint="Gunakan tipe untuk variasi konten harian."
        >
          <select
            style={styles.input}
            value={form.type}
            onChange={(e) =>
              setForm((current) => ({ ...current, type: e.target.value }))
            }
          >
            {MINI_GAME_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </Field>
        <Field
          label="Difficulty"
          hint="Dipakai sebagai label, bukan pembatas akses."
        >
          <select
            style={styles.input}
            value={form.difficulty}
            onChange={(e) =>
              setForm((current) => ({ ...current, difficulty: e.target.value }))
            }
          >
            {MINI_GAME_DIFFICULTIES.map((difficulty) => (
              <option key={difficulty}>{difficulty}</option>
            ))}
          </select>
        </Field>
      </div>
      <div style={styles.twoColumn}>
        <Field label="XP reward" hint="Masuk ke level progress.">
          <input
            style={styles.input}
            type="number"
            min={0}
            max={200}
            value={form.xp_reward}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                xp_reward: Number(e.target.value),
              }))
            }
          />
        </Field>
        <Field label="Hearts reward" hint="Masuk ke wallet Hearts user.">
          <input
            style={styles.input}
            type="number"
            min={0}
            max={200}
            value={form.hearts_reward}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                hearts_reward: Number(e.target.value),
              }))
            }
          />
        </Field>
      </div>
      <div style={styles.twoColumn}>
        <Field
          label="Tanggal aktif"
          hint="Kosongkan tidak tersedia di form ini, pilih tanggal target."
        >
          <input
            style={styles.input}
            type="date"
            value={form.active_date}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                active_date: e.target.value,
              }))
            }
          />
        </Field>
        <CheckboxField
          checked={form.is_active}
          onChange={(checked) =>
            setForm((current) => ({ ...current, is_active: checked }))
          }
          label="Aktifkan langsung"
          hint="Game langsung muncul jika masih dalam limit aktif."
        />
      </div>
      <Field
        label="Prompt utama"
        hint="Pertanyaan atau instruksi yang harus dijawab user."
      >
        <textarea
          style={styles.textarea}
          placeholder="Tanggal berapa movie night pertama kita?"
          value={form.prompt}
          onChange={(e) =>
            setForm((current) => ({ ...current, prompt: e.target.value }))
          }
          rows={2}
        />
      </Field>
      <Field
        label="Pilihan jawaban"
        hint="Opsional. Satu pilihan per baris untuk multiple choice."
      >
        <textarea
          style={styles.textarea}
          placeholder={"13 Mei\n25 Mei\n1 Juni"}
          value={form.options_json}
          onChange={(e) =>
            setForm((current) => ({ ...current, options_json: e.target.value }))
          }
          rows={3}
        />
      </Field>
      <Field
        label="Jawaban benar"
        hint="Boleh kosong untuk challenge, reflection, atau completion biasa."
      >
        <input
          style={styles.input}
          placeholder="25 Mei"
          value={form.correct_answer}
          onChange={(e) =>
            setForm((current) => ({
              ...current,
              correct_answer: e.target.value,
            }))
          }
        />
      </Field>
      <div style={styles.formActions}>
        <button style={styles.primaryButton} onClick={onSubmit}>
          Create Mini-game
        </button>
      </div>
    </div>
  );
}

function AdminRewardForm({
  form,
  setForm,
  onSubmit,
}: {
  form: ReturnType<typeof emptyRewardForm>;
  setForm: Dispatch<SetStateAction<ReturnType<typeof emptyRewardForm>>>;
  onSubmit: () => void;
}) {
  return (
    <div style={styles.formGrid}>
      <FormIntro
        title="Tambah katalog reward"
        body="Reward akan masuk shop user. Semua request tetap pending sampai admin approve."
      />
      <Field
        label="Nama reward"
        hint="Buat jelas dan singkat agar mudah dipilih user."
      >
        <input
          style={styles.input}
          placeholder="Voice note penyemangat"
          value={form.title}
          onChange={(e) =>
            setForm((current) => ({ ...current, title: e.target.value }))
          }
        />
      </Field>
      <Field
        label="Deskripsi reward"
        hint="Jelaskan apa yang akan user dapat setelah request disetujui."
      >
        <textarea
          style={styles.textarea}
          placeholder="Admin kirim voice note manis setelah request diapprove."
          value={form.description}
          onChange={(e) =>
            setForm((current) => ({ ...current, description: e.target.value }))
          }
          rows={2}
        />
      </Field>
      <div style={styles.twoColumn}>
        <Field
          label="Harga Hearts"
          hint="Balance Hearts user akan ditahan saat request dibuat."
        >
          <input
            style={styles.input}
            type="number"
            min={0}
            value={form.cost_hearts}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                cost_hearts: Number(e.target.value),
              }))
            }
          />
        </Field>
        <Field
          label="Kategori"
          hint="Contoh: experience, letter, date, treat, streak_protection."
        >
          <input
            style={styles.input}
            placeholder="experience"
            value={form.category}
            onChange={(e) =>
              setForm((current) => ({ ...current, category: e.target.value }))
            }
          />
        </Field>
      </div>
      <CheckboxField
        checked={form.is_active}
        onChange={(checked) =>
          setForm((current) => ({ ...current, is_active: checked }))
        }
        label="Reward aktif"
        hint="Reward aktif akan tampil di Reward Shop user."
      />
      <div style={styles.formActions}>
        <button style={styles.primaryButton} onClick={onSubmit}>
          Create Reward
        </button>
      </div>
    </div>
  );
}

function AdminQuestForm({
  form,
  setForm,
  onSubmit,
}: {
  form: ReturnType<typeof emptyQuestForm>;
  setForm: Dispatch<SetStateAction<ReturnType<typeof emptyQuestForm>>>;
  onSubmit: () => void;
}) {
  return (
    <div style={styles.formGrid}>
      <FormIntro
        title="Bangun bank daily quest"
        body="Quest di bank belum tampil ke user sampai diassign. Auto-pick akan memilih quest aktif yang belum/terlama dipakai."
      />
      <Field
        label="Judul quest"
        hint="Nama pendek yang memudahkan admin mengenali quest."
      >
        <input
          style={styles.input}
          placeholder="Satu hal baik hari ini"
          value={form.title}
          onChange={(e) =>
            setForm((current) => ({ ...current, title: e.target.value }))
          }
        />
      </Field>
      <Field
        label="Deskripsi internal"
        hint="Catatan singkat untuk admin, bukan prompt utama."
      >
        <textarea
          style={styles.textarea}
          placeholder="Refleksi kecil harian."
          value={form.description}
          onChange={(e) =>
            setForm((current) => ({ ...current, description: e.target.value }))
          }
          rows={2}
        />
      </Field>
      <div style={styles.twoColumn}>
        <Field label="Tipe quest" hint="Menentukan bentuk jawaban user.">
          <select
            style={styles.input}
            value={form.type}
            onChange={(e) =>
              setForm((current) => ({ ...current, type: e.target.value }))
            }
          >
            {[
              "reflection",
              "multiple_choice",
              "checklist",
              "text_answer",
              "self_care",
            ].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </Field>
        <Field label="Difficulty" hint="Label ringan untuk variasi quest.">
          <select
            style={styles.input}
            value={form.difficulty}
            onChange={(e) =>
              setForm((current) => ({ ...current, difficulty: e.target.value }))
            }
          >
            {["easy", "medium", "hard"].map((difficulty) => (
              <option key={difficulty}>{difficulty}</option>
            ))}
          </select>
        </Field>
      </div>
      <div style={styles.twoColumn}>
        <Field label="XP reward" hint="XP quest masuk progress level.">
          <input
            style={styles.input}
            type="number"
            min={0}
            value={form.xp_reward}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                xp_reward: Number(e.target.value),
              }))
            }
          />
        </Field>
        <Field label="Hearts reward" hint="Hearts quest masuk wallet user.">
          <input
            style={styles.input}
            type="number"
            min={0}
            value={form.hearts_reward}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                hearts_reward: Number(e.target.value),
              }))
            }
          />
        </Field>
      </div>
      <Field
        label="Prompt untuk user"
        hint="Pertanyaan atau instruksi yang muncul di dashboard user."
      >
        <textarea
          style={styles.textarea}
          placeholder="Tulis satu hal kecil yang bikin kamu senyum hari ini."
          value={form.prompt}
          onChange={(e) =>
            setForm((current) => ({ ...current, prompt: e.target.value }))
          }
          rows={2}
        />
      </Field>
      <Field
        label="Pilihan jawaban"
        hint="Opsional. Satu pilihan per baris untuk checklist atau multiple choice."
      >
        <textarea
          style={styles.textarea}
          placeholder={"Minum air\nMakan cukup\nIstirahat sebentar"}
          value={form.options_json}
          onChange={(e) =>
            setForm((current) => ({ ...current, options_json: e.target.value }))
          }
          rows={3}
        />
      </Field>
      <Field
        label="Jawaban benar"
        hint="Opsional. Isi hanya kalau quest perlu validasi benar/salah."
      >
        <input
          style={styles.input}
          placeholder="Optional"
          value={form.correct_answer}
          onChange={(e) =>
            setForm((current) => ({
              ...current,
              correct_answer: e.target.value,
            }))
          }
        />
      </Field>
      <div style={styles.formActions}>
        <button style={styles.primaryButton} onClick={onSubmit}>
          Create Quest
        </button>
      </div>
    </div>
  );
}

function AdminEventForm({
  form,
  setForm,
  onSubmit,
}: {
  form: ReturnType<typeof emptyEventForm>;
  setForm: Dispatch<SetStateAction<ReturnType<typeof emptyEventForm>>>;
  onSubmit: () => void;
}) {
  return (
    <div style={styles.formGrid}>
      <FormIntro
        title="Tambah event couple calendar"
        body="Event aktif akan muncul di kalender user bersama mood, quest, reward, dan momen spesial."
      />
      <Field
        label="Judul event"
        hint="Nama event yang akan tampil di kalender."
      >
        <input
          style={styles.input}
          placeholder="Movie night"
          value={form.title}
          onChange={(e) =>
            setForm((current) => ({ ...current, title: e.target.value }))
          }
        />
      </Field>
      <Field
        label="Deskripsi"
        hint="Opsional, pakai untuk konteks kecil event."
      >
        <textarea
          style={styles.textarea}
          placeholder="Quality time kecil setelah aktivitas hari ini."
          value={form.description}
          onChange={(e) =>
            setForm((current) => ({ ...current, description: e.target.value }))
          }
          rows={2}
        />
      </Field>
      <div style={styles.twoColumn}>
        <Field label="Tanggal event" hint="Tanggal event muncul di kalender.">
          <input
            style={styles.input}
            type="date"
            value={form.event_date}
            onChange={(e) =>
              setForm((current) => ({ ...current, event_date: e.target.value }))
            }
          />
        </Field>
        <Field
          label="Tipe event"
          hint="Dipakai countdown dan kalender untuk mengelompokkan momen."
        >
          <select
            style={styles.input}
            value={form.event_type}
            onChange={(e) =>
              setForm((current) => ({ ...current, event_type: e.target.value }))
            }
          >
            {COUPLE_EVENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <CheckboxField
        checked={form.is_special}
        onChange={(checked) =>
          setForm((current) => ({ ...current, is_special: checked }))
        }
        label="Special day"
        hint="Tandai event sebagai momen penting di kalender."
      />
      <div style={styles.formActions}>
        <button style={styles.primaryButton} onClick={onSubmit}>
          Create Event
        </button>
      </div>
    </div>
  );
}

function AdminHeroForm({
  form,
  setForm,
  isEditing,
  onCancel,
  onSubmit,
}: {
  form: ReturnType<typeof emptyHeroForm>;
  setForm: Dispatch<SetStateAction<ReturnType<typeof emptyHeroForm>>>;
  isEditing: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div style={styles.formGrid}>
      <FormIntro
        title={isEditing ? "Edit hero dashboard user" : "Atur hero dashboard user"}
        body="Copy ini muncul di area countdown/dashboard. Pesan aktif dengan tanggal terbaru yang sudah berlaku akan tampil untuk user."
      />
      <Field
        label="Headline hero"
        hint="Kalimat utama, sebaiknya pendek dan hangat."
      >
        <input
          style={styles.input}
          placeholder="Jaga mood, kumpulin Hearts, dan rawat garden pelan-pelan."
          value={form.title}
          onChange={(e) =>
            setForm((current) => ({ ...current, title: e.target.value }))
          }
        />
      </Field>
      <Field
        label="Supporting text"
        hint="Satu atau dua kalimat pendukung di bawah headline."
      >
        <textarea
          style={styles.textarea}
          placeholder="Hari ini cukup isi mood dulu. Quest dan reward bisa menyusul setelahnya."
          value={form.body}
          onChange={(e) =>
            setForm((current) => ({ ...current, body: e.target.value }))
          }
          rows={3}
        />
      </Field>
      <div style={styles.twoColumn}>
        <Field label="Tone" hint="Label untuk mengelompokkan gaya pesan.">
          <select
            style={styles.input}
            value={form.tone}
            onChange={(e) =>
              setForm((current) => ({ ...current, tone: e.target.value }))
            }
          >
            {["soft", "playful", "romantic", "supportive", "birthday"].map(
              (tone) => (
                <option key={tone}>{tone}</option>
              ),
            )}
          </select>
        </Field>
        <Field
          label="Active date"
          hint="Opsional. Kosong berarti bisa jadi default aktif."
        >
          <input
            style={styles.input}
            type="date"
            value={form.active_date}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                active_date: e.target.value,
              }))
            }
          />
        </Field>
      </div>
      <CheckboxField
        checked={form.is_active}
        onChange={(checked) =>
          setForm((current) => ({ ...current, is_active: checked }))
        }
        label="Publish sebagai hero aktif"
        hint="Jika aktif, hero bisa tampil saat tanggal aktifnya sudah berlaku."
      />
      <div style={styles.formActions}>
        {isEditing && (
          <button type="button" style={styles.secondaryButton} onClick={onCancel}>
            Cancel
          </button>
        )}
        <button style={styles.primaryButton} onClick={onSubmit}>
          {isEditing ? "Save Hero Copy" : "Publish Hero Copy"}
        </button>
      </div>
    </div>
  );
}

function SimpleList({
  items,
  empty,
  render,
}: {
  items: any[];
  empty: string;
  render: (item: any) => ReactNode;
}) {
  if (items.length === 0) return <p style={styles.mutedText}>{empty}</p>;

  return (
    <div style={styles.gameList}>
      {items.map((item) => (
        <div key={item.id} style={styles.gameCard}>
          {render(item)}
        </div>
      ))}
    </div>
  );
}

function MiniGameList({
  games,
  onUpdate,
  onDelete,
}: {
  games: MiniGame[];
  onUpdate: (game: MiniGame, patch: Partial<MiniGame>) => void;
  onDelete: (game: MiniGame) => void;
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
                {game.type} · {game.difficulty} · +{game.xp_reward} XP · +
                {game.hearts_reward ?? 0} Hearts
              </p>
              <h3 style={styles.gameTitle}>{game.title}</h3>
              {game.prompt && <p style={styles.mutedText}>{game.prompt}</p>}
            </div>
            <div style={styles.inlineActions}>
              <button
                style={
                  game.is_active
                    ? styles.dangerButton
                    : styles.primaryButtonCompact
                }
                onClick={() => onUpdate(game, { is_active: !game.is_active })}
              >
                {game.is_active ? "Deactivate" : "Activate"}
              </button>
              {!game.is_active && (
                <button
                  type="button"
                  style={styles.iconActionSmall}
                  onClick={() => onDelete(game)}
                  aria-label={`Hapus ${game.title}`}
                  title="Hapus"
                >
                  🗑️
                </button>
              )}
            </div>
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
      "linear-gradient(180deg, rgba(26, 15, 21, 0.92), rgba(26, 15, 21, 1)), repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 96px)",
    display: "grid",
    gridTemplateColumns: "280px minmax(0, 1fr)",
  },
  sidebar: {
    gridRow: "1 / span 2",
    minHeight: "100vh",
    borderRight: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(28, 15, 22, 0.78)",
    padding: 22,
    position: "sticky",
    top: 0,
    alignSelf: "start",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 26,
  },
  brandIcon: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 8,
    background: "rgba(241, 185, 214, 0.14)",
    fontSize: 22,
  },
  brandTitle: {
    display: "block",
    fontFamily: "Syne, sans-serif",
    fontWeight: 900,
  },
  brandSubtitle: {
    display: "block",
    color: "var(--text-muted)",
    fontSize: 12,
    fontWeight: 800,
    marginTop: 2,
  },
  nav: {
    display: "grid",
    gap: 10,
  },
  navItem: {
    minHeight: 54,
    border: "1px solid transparent",
    borderRadius: 8,
    background: "transparent",
    color: "var(--text)",
    display: "grid",
    gridTemplateColumns: "30px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 10,
    padding: 10,
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
    textAlign: "left",
  },
  navActive: {
    borderColor: "rgba(241,185,214,0.22)",
    background: "rgba(255,255,255,0.07)",
  },
  navIcon: {
    fontSize: 20,
    lineHeight: 1,
  },
  navCount: {
    color: "var(--text-muted)",
    fontStyle: "normal",
    fontWeight: 900,
  },
  header: {
    width: "min(1220px, calc(100% - 48px))",
    margin: "0 auto 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    padding: "24px 0 0",
  },
  headerTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
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
  eyebrow: {
    color: "#f1b9d6",
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase",
    marginTop: 6,
  },
  pageTitle: {
    fontSize: "clamp(34px, 6vw, 74px)",
    lineHeight: 0.9,
    margin: "5px 0 8px",
    fontFamily: "Syne, sans-serif",
  },
  topActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  iconAction: {
    width: 42,
    height: 42,
    border: 0,
    borderRadius: 999,
    background: "transparent",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    fontSize: 22,
    lineHeight: 1,
    padding: 0,
  },
  iconActionSmall: {
    width: 38,
    height: 38,
    border: 0,
    borderRadius: 999,
    background: "transparent",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    fontSize: 22,
    lineHeight: 1,
    padding: 0,
  },
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
    width: "min(1220px, calc(100% - 48px))",
    margin: "0 auto",
    padding: "0 0 48px",
    display: "flex",
    flexDirection: "column",
    gap: 18,
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
    display: "none",
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
  moodPanelStack: {
    display: "grid",
    gap: 18,
  },
  notesScroll: {
    maxHeight: 248,
    overflowY: "auto",
    paddingRight: 6,
    overscrollBehavior: "contain",
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
  formGrid: { display: "grid", gap: 14 },
  formIntro: {
    border: "1px solid rgba(241,185,214,0.14)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.045)",
    padding: "12px 14px",
    display: "grid",
    gap: 4,
  },
  formIntroTitle: {
    fontFamily: "Syne, sans-serif",
    fontSize: 15,
  },
  formIntroText: {
    color: "var(--text-muted)",
    fontSize: 13,
    lineHeight: 1.45,
    margin: 0,
  },
  field: {
    display: "grid",
    gap: 7,
  },
  fieldLabel: {
    color: "#f1b9d6",
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase",
  },
  fieldHint: {
    color: "var(--text-muted)",
    fontSize: 12,
    lineHeight: 1.45,
  },
  twoColumn: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  input: {
    width: "100%",
    minHeight: 44,
    padding: "11px 13px",
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--surface2)",
    color: "var(--text)",
    fontFamily: "DM Sans, sans-serif",
  },
  textarea: {
    width: "100%",
    padding: "11px 13px",
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--surface2)",
    color: "var(--text)",
    fontFamily: "DM Sans, sans-serif",
    resize: "vertical",
  },
  checkboxLabel: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    fontSize: 13,
  },
  checkboxCard: {
    minHeight: 44,
    display: "flex",
    gap: 10,
    alignItems: "center",
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--surface2)",
    padding: "10px 12px",
    cursor: "pointer",
  },
  checkboxTitle: {
    display: "block",
    fontSize: 13,
    lineHeight: 1.3,
  },
  checkboxHint: {
    display: "block",
    color: "var(--text-muted)",
    fontSize: 12,
    lineHeight: 1.45,
    marginTop: 2,
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    paddingTop: 2,
  },
  primaryButton: {
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    background: "var(--accent)",
    color: "#210d18",
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "10px 14px",
    background: "rgba(255,255,255,0.05)",
    color: "var(--text)",
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
  disabledButtonCompact: {
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "9px 12px",
    background: "rgba(255,255,255,0.06)",
    color: "var(--text-muted)",
    fontWeight: 800,
    cursor: "not-allowed",
    whiteSpace: "nowrap",
    opacity: 0.72,
  },
  secondaryButtonCompact: {
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "9px 12px",
    background: "rgba(255,255,255,0.05)",
    color: "var(--text)",
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
  inlineActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 10,
  },
  gameMeta: { fontSize: 11, color: "var(--text-muted)", marginBottom: 4 },
  assignedTodayBadge: {
    width: "fit-content",
    borderRadius: 999,
    padding: "4px 8px",
    background: "rgba(119, 215, 185, 0.14)",
    color: "#9debd2",
    fontSize: 11,
    fontWeight: 900,
    marginBottom: 6,
  },
  gameTitle: { fontFamily: "Syne, sans-serif", fontSize: 15, marginBottom: 6 },
};
