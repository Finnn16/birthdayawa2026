"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { createClient } from "@/lib/supabase";
import { EMOJI_MAP, type LevelProgressData } from "@/lib/mood-types";
import { type MiniGame } from "@/lib/minigames";
import { calculateMoodXP } from "@/lib/xp";
import { LoadingButton, LoadingSpinner } from "@/components/LoadingSpinner";
import ProfileCard from "@/components/ProfileCard";
import { getTodayDateString } from "@/lib/date";
import { isLetterUnlocked } from "@/lib/letter/letterContent";
import styles from "./dashboard.module.css";

const ratingColor = (r: number) => {
  if (r <= 3) return "#d4646f";
  if (r <= 6) return "#b8a088";
  if (r <= 8) return "#8a9eb8";
  return "#a89a8f";
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
  hearts_earned?: number;
};

type EngagementData = {
  heartsBalance: number;
  rewards: any[];
  redemptions: any[];
  questAssignments: any[];
  questCompletions: any[];
  inventory: any[];
  gardenItems: any[];
  calendar: {
    events: any[];
    moods: any[];
    quests: any[];
    rewards: any[];
  };
};

type HeroMessageData = {
  title: string;
  body: string;
  tone?: string;
};

type CountdownTarget = {
  title: string;
  eventTitle: string;
  date: string;
};

async function readJsonResponse(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {
      error: `Response non-JSON (${res.status})`,
      details: text.slice(0, 160),
    };
  }
}

function readStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getJakartaDateString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getJakartaHour(date = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    hour12: false,
  }).format(date);
  return Number(hour);
}

function isJakartaNight(date = new Date()): boolean {
  const hour = getJakartaHour(date);
  return hour >= 18 || hour < 6;
}

function useJakartaNight() {
  const [isNight, setIsNight] = useState(() => isJakartaNight());

  useEffect(() => {
    const updateNightState = () => setIsNight(isJakartaNight());
    updateNightState();
    const timer = window.setInterval(updateNightState, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return isNight;
}

function getNextCountdownTarget(events: any[]): CountdownTarget | null {
  const today = getJakartaDateString();
  const nextEvent = events
    .filter(
      (event) =>
        event?.is_active !== false &&
        typeof event?.event_date === "string" &&
        event.event_date.slice(0, 10) >= today,
    )
    .sort((a, b) => a.event_date.localeCompare(b.event_date))[0];

  if (!nextEvent) return null;

  const eventTitle = String(nextEvent.title ?? "Couple event").trim();
  const eventType = String(nextEvent.event_type ?? "").toLowerCase();
  const titleText = `${eventTitle} ${eventType}`.toLowerCase();
  const isBirthday =
    titleText.includes("birthday") || titleText.includes("ulang tahun");

  return {
    title: isBirthday ? "Birthday countdown" : `${eventTitle} countdown`,
    eventTitle,
    date: nextEvent.event_date.slice(0, 10),
  };
}

function formatReadableDate(dateString: string): string {
  return new Date(`${dateString}T00:00:00+07:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const emptyEngagementData: EngagementData = {
  heartsBalance: 0,
  rewards: [],
  redemptions: [],
  questAssignments: [],
  questCompletions: [],
  inventory: [],
  gardenItems: [],
  calendar: { events: [], moods: [], quests: [], rewards: [] },
};

const defaultHeroMessage = {
  title: "Jaga mood, kumpulin Hearts, dan rawat garden pelan-pelan.",
  body: "Hari ini cukup isi mood dulu. Quest dan reward bisa menyusul setelahnya.",
};

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [miniGames, setMiniGames] = useState<MiniGame[]>([]);
  const [completions, setCompletions] = useState<MiniGameCompletionData[]>([]);
  const [miniGameMessage, setMiniGameMessage] = useState("");
  const [engagement, setEngagement] =
    useState<EngagementData>(emptyEngagementData);
  const [engagementMessage, setEngagementMessage] = useState("");
  const [heroMessage, setHeroMessage] =
    useState<HeroMessageData>(defaultHeroMessage);
  const [letterTeaserOpen, setLetterTeaserOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [questAnswers, setQuestAnswers] = useState<Record<string, string>>({});
  const [rewardNotes, setRewardNotes] = useState<Record<string, string>>({});
  const [shopOpen, setShopOpen] = useState(false);
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittingGameId, setSubmittingGameId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [activeTask, setActiveTask] = useState<"mood" | "quest" | "minigame">(
    "mood",
  );
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

  const fetchHeroMessage = useCallback(async () => {
    const res = await fetch("/api/hero-message");
    if (res.status === 401) return;
    const json = await readJsonResponse(res);
    setHeroMessage(json.heroMessage ?? defaultHeroMessage);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/dashboard");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const json = await readJsonResponse(res);
    if (!res.ok) {
      setError(json.error ?? json.details ?? "Gagal memuat dashboard.");
      setLoading(false);
      return;
    }

    setData(json.dashboard);
    setMiniGames(json.minigames ?? []);
    setCompletions(json.completions ?? []);
    setEngagement(json.engagement ?? emptyEngagementData);
    setHeroMessage(json.heroMessage ?? defaultHeroMessage);
    setMiniGameMessage(json.minigameMessage ?? "");
    setLoading(false);
  }, [router]);

  const fetchEngagement = useCallback(async () => {
    const [
      heartsRes,
      rewardsRes,
      redemptionsRes,
      questsRes,
      inventoryRes,
      gardenRes,
      calendarRes,
    ] = await Promise.all([
      fetch("/api/hearts"),
      fetch("/api/rewards"),
      fetch("/api/rewards/redemptions"),
      fetch("/api/daily-quests"),
      fetch("/api/inventory"),
      fetch("/api/garden"),
      fetch("/api/couple-calendar"),
    ]);

    if (heartsRes.status === 401) return;

    const [hearts, rewards, redemptions, quests, inventory, garden, calendar] =
      await Promise.all([
        readJsonResponse(heartsRes),
        readJsonResponse(rewardsRes),
        readJsonResponse(redemptionsRes),
        readJsonResponse(questsRes),
        readJsonResponse(inventoryRes),
        readJsonResponse(gardenRes),
        readJsonResponse(calendarRes),
      ]);

    setEngagement({
      heartsBalance: hearts.balance ?? 0,
      rewards: rewards.rewards ?? [],
      redemptions: redemptions.redemptions ?? [],
      questAssignments: quests.assignments ?? [],
      questCompletions: quests.completions ?? [],
      inventory: inventory.inventory ?? [],
      gardenItems: garden.gardenItems ?? [],
      calendar: {
        events: calendar.events ?? [],
        moods: calendar.moods ?? [],
        quests: calendar.quests ?? [],
        rewards: calendar.rewards ?? [],
      },
    });
  }, []);

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

  useEffect(() => {
    if (!letterTeaserOpen) return;

    const timer = window.setTimeout(() => setLetterTeaserOpen(false), 3200);
    return () => window.clearTimeout(timer);
  }, [letterTeaserOpen]);

  async function handleSubmit() {
    setError("");
    setSubmitting(true);

    const trimmedNote = note.trim();
    if (!trimmedNote) {
      setError("Isi pesan mood dulu ya.");
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/moods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, note: trimmedNote }),
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
        colors: ["#a89a8f", "#8a9eb8", "#b8a088"],
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
        ? `Yeay, +${json.xpEarned} XP dan +${json.heartsEarned ?? 0} Hearts dari mini-game.`
        : "TETOT, Salah kocak HAHAHAHA. Boleh coba lagi kok xixixixi.",
    );
    setSubmittingGameId(null);
    fetchData();
  }

  async function handleRewardRedeem(rewardId: string) {
    setEngagementMessage("");
    const res = await fetch(`/api/rewards/${rewardId}/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: rewardNotes[rewardId] ?? "" }),
    });
    const json = await readJsonResponse(res);
    if (!res.ok) {
      setEngagementMessage(
        json.error ?? json.details ?? "Reward belum bisa diredeem.",
      );
      return;
    }
    setEngagementMessage(
      "Reward masuk request pending. Tunggu approval admin ya.",
    );
    fetchEngagement();
  }

  async function handleQuestComplete(assignmentId: string) {
    setEngagementMessage("");
    const res = await fetch(`/api/daily-quests/${assignmentId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: questAnswers[assignmentId] ?? "" }),
    });
    const json = await readJsonResponse(res);
    if (!res.ok) {
      setEngagementMessage(
        json.error ?? json.details ?? "Quest belum bisa diselesaikan.",
      );
      return;
    }
    setEngagementMessage(
      `Quest selesai: +${json.xpEarned ?? 0} XP, +${json.heartsEarned ?? 0} Hearts.`,
    );
    fetchData();
  }

  async function handleUseProtection(itemType: string) {
    setEngagementMessage("");
    const res = await fetch("/api/streak-protection/use", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_type: itemType }),
    });
    const json = await readJsonResponse(res);
    if (!res.ok) {
      setEngagementMessage(
        json.error ?? json.details ?? "Item belum bisa dipakai.",
      );
      return;
    }
    setEngagementMessage(
      json.message ??
        "Request streak protection dikirim. Tunggu approval admin.",
    );
    fetchEngagement();
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

  const letterUnlocked = isLetterUnlocked(getTodayDateString());

  const handleLetterTeaser = useCallback(() => {
    setLetterTeaserOpen(true);
    if (letterUnlocked) {
      window.open("/letter?autoPrint=1", "_blank", "noopener,noreferrer");
    }
  }, [letterUnlocked]);

  const completionByGameId = useMemo(
    () =>
      completions.reduce<Record<string, MiniGameCompletionData>>(
        (map, completion) => {
          map[completion.minigame_id] = completion;
          return map;
        },
        {},
      ),
    [completions],
  );

  const selectedReward = useMemo(
    () =>
      engagement.rewards.find((reward) => reward.id === selectedRewardId) ??
      engagement.rewards[0] ??
      null,
    [engagement.rewards, selectedRewardId],
  );
  const countdownTarget = useMemo(
    () => getNextCountdownTarget(engagement.calendar.events),
    [engagement.calendar.events],
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
  const nextMoodXpPreview = calculateMoodXP(
    (data?.currentStreak ?? 0) + 1,
  ).finalXP;
  const levelProgress = data?.level;
  const levelLabel = levelProgress
    ? `Level ${levelProgress.currentLevel.levelNumber} - ${levelProgress.currentLevel.levelName}`
    : "Level 1 - Baru mulai";
  const progressValue = levelProgress?.nextLevel
    ? levelProgress.progressXP
    : (levelProgress?.totalXP ?? data?.totalXP ?? 0);
  const maxProgressValue = levelProgress?.nextLevel
    ? levelProgress.requiredForNext
    : Math.max(1, progressValue);

  return (
    <motion.main
      className={styles.page}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <motion.header
        className={styles.topbar}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
      >
        <ProfileCard
          username={username ? `@${username}` : "@Username"}
          level={levelLabel}
          progress={progressValue}
          maxProgress={maxProgressValue}
          tag="#BESTGF"
          onLogout={handleLogout}
          logoutLoading={logoutLoading}
          stats={[
            { label: "Streaks", value: `${data?.currentStreak ?? 0} hari` },
            {
              label: "Level",
              value: levelProgress
                ? `Lv ${levelProgress.currentLevel.levelNumber}`
                : "Lv 1",
            },
            { label: "Multiplier", value: `${data?.streakMultiplier ?? 1}x` },
          ]}
        />
      </motion.header>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <DashboardHero message={heroMessage} target={countdownTarget} />
      </motion.div>

      <FloatingLetterTeaser
        isOpen={letterTeaserOpen}
        onClick={handleLetterTeaser}
      />

      <motion.section
        className={styles.layout}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className={styles.primaryColumn}>
          <section className={styles.todayPanel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Daily hub</p>
                <h2>Satu-satu duls saja yaa</h2>
              </div>
              <span className={styles.rewardBadge}>
                +{nextMoodXpPreview} XP ready
              </span>
            </div>

            <div className={styles.segmented} aria-label="Pilih aktivitas">
              <TaskButton
                active={activeTask === "mood"}
                label="Mood"
                onClick={() => setActiveTask("mood")}
              />
              <TaskButton
                active={activeTask === "quest"}
                label="Quest"
                onClick={() => setActiveTask("quest")}
              />
              <TaskButton
                active={activeTask === "minigame"}
                label="Mini-game"
                onClick={() => setActiveTask("minigame")}
              />
            </div>

            <motion.div
              className={
                activeTask === "mood" ? styles.taskPaneActive : styles.taskPane
              }
              key={`task-${activeTask}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <MoodPanel
                alreadySubmitted={alreadySubmitted}
                todayMood={data?.todayMood ?? null}
                result={result}
                rating={rating}
                note={note}
                currentColor={currentColor}
                error={error}
                submitting={submitting}
                rewardPreview={nextMoodXpPreview}
                onRatingChange={setRating}
                onNoteChange={setNote}
                onSubmit={handleSubmit}
              />
            </motion.div>

            <motion.div
              className={
                activeTask === "quest" ? styles.taskPaneActive : styles.taskPane
              }
              key={`quest-${activeTask}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <DailyQuestSection
                data={engagement}
                message={engagementMessage}
                questAnswers={questAnswers}
                onQuestAnswerChange={(id, value) =>
                  setQuestAnswers((current) => ({ ...current, [id]: value }))
                }
                onQuestComplete={handleQuestComplete}
              />
            </motion.div>

            <motion.div
              className={
                activeTask === "minigame"
                  ? styles.taskPaneActive
                  : styles.taskPane
              }
              key={`game-${activeTask}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
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
            </motion.div>
          </section>
        </div>

        <motion.aside
          className={styles.sideColumn}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {data?.level && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              {/* <LevelCard level={data.level} /> */}
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.55 }}
          >
            <RewardShopPanel
              data={engagement}
              onOpenShop={() => {
                setSelectedRewardId(
                  (current) => current ?? engagement.rewards[0]?.id ?? null,
                );
                setShopOpen(true);
              }}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <GardenInventoryPanel
              data={engagement}
              onUseProtection={handleUseProtection}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.65 }}
          >
            <CalendarSection data={engagement} />
          </motion.div>
          {(data?.history?.length ?? 0) > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.7 }}
            >
              <HistoryPanel history={data!.history} />
            </motion.div>
          )}
        </motion.aside>
      </motion.section>

      {shopOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <RewardShopModal
            rewards={engagement.rewards}
            heartsBalance={engagement.heartsBalance}
            selectedReward={selectedReward}
            rewardNotes={rewardNotes}
            onSelectReward={(rewardId) => setSelectedRewardId(rewardId)}
            onNoteChange={(rewardId, value) =>
              setRewardNotes((current) => ({ ...current, [rewardId]: value }))
            }
            onClose={() => setShopOpen(false)}
            onRedeem={(rewardId) => {
              handleRewardRedeem(rewardId);
              setShopOpen(false);
            }}
          />
        </motion.div>
      )}
    </motion.main>
  );
}

function TaskButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      className={active ? styles.segmentActive : styles.segmentButton}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {label}
    </motion.button>
  );
}

function TypewriterText({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  // Handle typing animation
  useEffect(() => {
    if (currentIndex < text.length) {
      const char = text[currentIndex];
      // Natural typing delays based on character type (slower version)
      const getDelay = (c: string) => {
        if (c === " ") return 100; // Space is quick
        if (/[.!?,;:]/.test(c)) return 300; // Punctuation is slower
        if (/[aeiouAEIOU]/.test(c)) return 130; // Vowels slightly slower
        return 150; // Default for consonants
      };

      const delay = getDelay(char);
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + char);
        setCurrentIndex((prev) => prev + 1);
      }, delay);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text]);

  // Handle restart after animation completes
  useEffect(() => {
    if (
      currentIndex === text.length &&
      displayedText === text &&
      text.length > 0
    ) {
      // Animation is complete, wait 3 seconds then restart
      const restartTimeout = setTimeout(() => {
        setDisplayedText("");
        setCurrentIndex(0);
      }, 5000); // 3 second pause

      return () => clearTimeout(restartTimeout);
    }
  }, [currentIndex, displayedText, text]);

  return (
    <motion.h2
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {displayedText}
      {currentIndex < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          style={{ marginLeft: "2px" }}
        >
          |
        </motion.span>
      )}
    </motion.h2>
  );
}

function DashboardHero({
  message,
  target,
}: {
  message: { title: string; body: string };
  target: CountdownTarget | null;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const targetTime = target
    ? new Date(`${target.date}T00:00:00+07:00`).getTime()
    : null;
  const remaining = now && targetTime ? Math.max(targetTime - now, 0) : 0;

  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return (
    <motion.section
      className={styles.hero}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <motion.div
        className={styles.heroCountdown}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div>
          <p className={styles.countdownTitle}>
            {target?.title ?? "Couple countdown"}
          </p>
          {target ? (
            <>
              <h1>{days} hari lagi</h1>
              <p className={styles.countdownMeta}>
                {target.eventTitle} · {formatReadableDate(target.date)}
              </p>
            </>
          ) : (
            <>
              <h1>Belum ada event</h1>
              <p className={styles.countdownMeta}>
                Ditunggu yaa kita planning duls mwehehe.
              </p>
            </>
          )}
        </div>
        {target && (
          <motion.div
            className={styles.countdown}
            aria-label={target.title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <HeroTimeBox value={String(days).padStart(2, "0")} label="Hari" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.35 }}
            >
              <HeroTimeBox value={String(hours).padStart(2, "0")} label="Jam" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <HeroTimeBox
                value={String(minutes).padStart(2, "0")}
                label="Menit"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.45 }}
            >
              <HeroTimeBox
                value={String(seconds).padStart(2, "0")}
                label="Detik"
              />
            </motion.div>
          </motion.div>
        )}
      </motion.div>
      <motion.div
        className={styles.heroCopy}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <TypewriterText text={message.title} />
        <p>{message.body}</p>
      </motion.div>
    </motion.section>
  );
}

function FloatingLetterTeaser({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className={styles.letterTeaser}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.letterTeaserBubble}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            Suratnya sudah siap diunduh jadi PDF.
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        className={styles.letterTeaserButton}
        onClick={onClick}
        aria-label="Download letter to PDF"
        whileHover={{ y: -2, scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3.5" y="6.5" width="17" height="11" rx="2.2" />
          <path d="m4.5 8 7.5 5.4L19.5 8" />
          <path d="m4.8 16.2 5.3-4" />
          <path d="m19.2 16.2-5.3-4" />
        </svg>
        <span>Download to PDF</span>
        <span className={styles.letterTeaserSeal} aria-hidden="true" />
      </motion.button>
    </div>
  );
}

function HeroTimeBox({ value, label }: { value: string; label: string }) {
  return (
    <motion.div
      className={styles.timeBox}
      whileHover={{ scale: 1.1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.strong
        key={value}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {value}
      </motion.strong>
      <span>{label}</span>
    </motion.div>
  );
}

function MoodPanel({
  alreadySubmitted,
  todayMood,
  result,
  rating,
  note,
  currentColor,
  error,
  submitting,
  rewardPreview,
  onRatingChange,
  onNoteChange,
  onSubmit,
}: {
  alreadySubmitted: boolean;
  todayMood: DashboardData["todayMood"];
  result: {
    message: string;
    streakDay: number;
    xpEarned: number;
    multiplier?: number;
  } | null;
  rating: number;
  note: string;
  currentColor: string;
  error: string;
  submitting: boolean;
  rewardPreview: number;
  onRatingChange: (rating: number) => void;
  onNoteChange: (note: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className={styles.panel}>
      {alreadySubmitted && todayMood ? (
        <AlreadyDone mood={todayMood} />
      ) : result ? (
        <ResultView result={result} onReset={() => undefined} />
      ) : (
        <>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Mood check-in</p>
              <h2>Gimana hari ini?</h2>
            </div>
            <span className={styles.moodBadge}>{rating}/10</span>
          </div>

          <motion.div className={styles.moodStage} layout>
            <motion.div
              className={styles.moodEmoji}
              aria-hidden="true"
              key={rating}
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {EMOJI_MAP[rating]}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <motion.strong
                key={`rating-${rating}`}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {rating}/10
              </motion.strong>
              <motion.span
                key={`mood-label-${rating}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {rating <= 3 ? "Berat" : rating <= 6 ? "Cukup" : "Hangat"}
              </motion.span>
            </motion.div>
          </motion.div>

          <motion.div
            className={styles.sliderWrap}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <motion.input
              className={styles.moodSlider}
              type="range"
              min={1}
              max={10}
              value={rating}
              onChange={(event) => onRatingChange(Number(event.target.value))}
              style={
                {
                  "--mood-progress": `${((rating - 1) / 9) * 100}%`,
                  "--mood-color": currentColor,
                } as CSSProperties
              }
              aria-label="Pilih mood hari ini"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              className={styles.sliderMeta}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </motion.div>
          </motion.div>

          <motion.textarea
            className={styles.note}
            placeholder="Tulis sedikit cerita hari ini..."
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            rows={4}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            whileFocus={{ scale: 1.02, boxShadow: "0 0 0 3px rgba(0,0,0,0.1)" }}
          />

          {error && (
            <motion.p
              style={s.error}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {error}
            </motion.p>
          )}

          <motion.div
            className={styles.actionRow}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <LoadingButton
              className={styles.primaryButton}
              onClick={onSubmit}
              loading={submitting}
            >
              Simpan Mood
            </LoadingButton>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              Reward streak: +{rewardPreview} XP
            </motion.p>
          </motion.div>
        </>
      )}
    </section>
  );
}

function DailyQuestSection({
  data,
  message,
  questAnswers,
  onQuestAnswerChange,
  onQuestComplete,
}: {
  data: EngagementData;
  message: string;
  questAnswers: Record<string, string>;
  onQuestAnswerChange: (id: string, value: string) => void;
  onQuestComplete: (id: string) => void;
}) {
  const completedQuestIds = new Set(
    data.questCompletions.map((completion) => completion.assignment_id),
  );

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>Daily quest</p>
          <h2>Quest hari ini</h2>
        </div>
      </div>
      {message && <p style={s.infoText}>{message}</p>}
      {data.questAssignments.length === 0 ? (
        <p style={s.emptyText}>Belum ada quest hari ini.</p>
      ) : (
        <div className={styles.questList}>
          {data.questAssignments.map((assignment) => {
            const quest = assignment.daily_quest_bank;
            const done = completedQuestIds.has(assignment.id);
            const options = readStringList(quest?.options_json);

            return (
              <article key={assignment.id} className={styles.questCard}>
                <div>
                  <p style={s.kicker}>
                    {quest?.type} · {quest?.difficulty}
                  </p>
                  <h3>{quest?.title}</h3>
                  {quest?.prompt && <p>{quest.prompt}</p>}
                </div>
                {done ? (
                  <button type="button">Selesai</button>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {options.length > 0 ? (
                      <div style={s.optionGrid}>
                        {options.map((option, index) => (
                          <button
                            key={`${assignment.id}-option-${index}-${option}`}
                            type="button"
                            style={{
                              ...s.optionBtn,
                              ...(questAnswers[assignment.id] === option
                                ? s.optionBtnActive
                                : {}),
                            }}
                            onClick={() =>
                              onQuestAnswerChange(assignment.id, option)
                            }
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        style={s.textarea}
                        placeholder="Jawaban kecil kamu..."
                        rows={2}
                        value={questAnswers[assignment.id] ?? ""}
                        onChange={(event) =>
                          onQuestAnswerChange(assignment.id, event.target.value)
                        }
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => onQuestComplete(assignment.id)}
                    >
                      +{quest?.hearts_reward ?? 0} Hearts
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function RewardShopPanel({
  data,
  onOpenShop,
}: {
  data: EngagementData;
  onOpenShop: () => void;
}) {
  return (
    <section className={`${styles.panel} ${styles.rewardPanel}`}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>Reward shop</p>
          <h2>Mau tuker hadiah ga?</h2>
        </div>
      </div>
      <div className={styles.shopPreview}>
        <div className={styles.walletCard}>
          <span className={styles.walletLabel}>Hearts kamu</span>
          <div className={styles.walletAmount}>
            <strong>{data.heartsBalance}</strong>
            <span>Hearts</span>
          </div>
          <HeartStack count={data.heartsBalance} />
        </div>
        <p className={styles.shopHint}>Mau hadiah apa ngook?</p>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={onOpenShop}
          disabled={data.rewards.length === 0}
        >
          Buka Reward Shop
        </button>
      </div>
    </section>
  );
}

function GardenInventoryPanel({
  data,
  onUseProtection,
}: {
  data: EngagementData;
  onUseProtection: (itemType: string) => void;
}) {
  const garden = buildMoodGarden(data.gardenItems);
  const isNightGarden = useJakartaNight();
  const gardenStageClass =
    styles[`gardenStage${garden.stageIndex}` as keyof typeof styles] ?? "";
  const gardenFlowerClass =
    styles[`flowerType${garden.activeFlower.type}` as keyof typeof styles] ??
    "";

  return (
    <section className={`${styles.panel} ${styles.gardenPanel}`}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>Mood garden</p>
          <h2>{garden.title}</h2>
        </div>
        <span className={styles.gardenStageBadge}>{garden.stageLabel}</span>
      </div>

      <div
        className={`${styles.gardenBed} ${gardenStageClass} ${gardenFlowerClass} ${
          isNightGarden ? styles.gardenBedNight : ""
        } ${garden.isWilted ? styles.gardenBedWilted : ""}`}
        style={
          {
            "--garden-growth": `${garden.progressPercent}%`,
            "--garden-growth-ratio": garden.progressRatio,
            "--garden-stem-height": `${18 + 74 * garden.progressRatio}px`,
            "--garden-leaf-bottom": `${90 + 36 * garden.progressRatio}px`,
            "--garden-bloom-bottom": `${104 + 68 * garden.progressRatio}px`,
            "--garden-accent": garden.accent,
            "--garden-accent-soft": garden.activeFlower.soft,
            "--garden-core": garden.activeFlower.core,
          } as CSSProperties
        }
      >
        <div className={styles.gardenSky}>
          <span />
          <span />
          <span />
        </div>
        <div className={styles.plantScene} aria-label={garden.ariaLabel}>
          <div className={styles.sunMark} />
          <div className={styles.plantPot}>
            <div className={styles.plantSoil} />
            <div className={styles.plantStem} />
            <div className={styles.plantLeafLeft} />
            <div className={styles.plantLeafRight} />
            <div className={styles.plantBud} />
            <div className={styles.flowerPetalTop} />
            <div className={styles.flowerPetalLeft} />
            <div className={styles.flowerPetalRight} />
            <div className={styles.flowerCore} />
          </div>
        </div>

        <div className={styles.gardenStatus}>
          <strong>{garden.statusTitle}</strong>
          <span>{garden.statusCopy}</span>
        </div>

        <div className={styles.growthTrack} aria-hidden="true">
          {GARDEN_STAGES.map((stage, index) => (
            <span
              key={stage}
              className={
                index <= garden.stageIndex
                  ? styles.growthStepActive
                  : styles.growthStep
              }
              title={stage}
            />
          ))}
        </div>

        <div
          className={styles.gardenBloomShelf}
          aria-label={`${garden.bloomedFlowers} bunga terkumpul`}
        >
          {Array.from({ length: garden.bloomShelfSize }).map((_, index) => (
            <span
              key={`bloom-slot-${index}`}
              className={
                index < garden.bloomedFlowers
                  ? `${styles.bloomSlotActive} ${
                      styles[
                        `bloomType${
                          garden.bloomEntries[
                            index % garden.bloomEntries.length
                          ].type
                        }` as keyof typeof styles
                      ] ?? ""
                    }`
                  : styles.bloomSlot
              }
              style={
                {
                  "--bloom-accent":
                    garden.bloomEntries[index % garden.bloomEntries.length]
                      .accent,
                  "--bloom-accent-soft":
                    garden.bloomEntries[index % garden.bloomEntries.length]
                      .soft,
                  "--bloom-core":
                    garden.bloomEntries[index % garden.bloomEntries.length]
                      .core,
                } as CSSProperties
              }
              title={
                index < garden.bloomedFlowers
                  ? `Bunga ${index + 1}`
                  : "Slot bunga"
              }
            />
          ))}
        </div>
      </div>

      {data.inventory.length > 0 && (
        <div className={styles.gardenTools}>
          {data.inventory.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onUseProtection(item.item_type)}
            >
              <span>{gardenToolLabel(item.item_type)}</span>
              <strong>{item.quantity}</strong>
            </button>
          ))}
        </div>
      )}

      {false && (
        <>
          <div style={s.optionGrid}>
            {data.inventory.map((item) => (
              <button
                key={item.id}
                style={s.optionBtn}
                type="button"
                onClick={() => onUseProtection(item.item_type)}
              >
                {item.item_type} · {item.quantity}
              </button>
            ))}
          </div>
          {data.gardenItems.length === 0 ? (
            <p style={s.emptyText}>Garden masih kosong.</p>
          ) : (
            <div className={styles.gardenGrid}>
              {data.gardenItems.slice(0, 12).map((item) => (
                <div
                  key={item.id}
                  className={styles.gardenTile}
                  title={item.item_type}
                >
                  {gardenEmoji(item.item_type)}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function CalendarSection({ data }: { data: EngagementData }) {
  const events = data.calendar.events.slice(0, 6);

  return (
    <section className={`${styles.panel} ${styles.calendarPanel}`}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>Couple calendar</p>
          <h2>Agenda dekat</h2>
        </div>
      </div>
      {events.length === 0 ? (
        <p style={s.emptyText}>Belum ada event calendar.</p>
      ) : (
        <div className={styles.calendarList}>
          {events.map((event, index) => (
            <div key={`${event.id}-${index}`} className={styles.calendarRow}>
              <time>
                {event.event_date ??
                  event.active_date ??
                  event.requested_at?.slice(0, 10)}
              </time>
              <div>
                <strong>{event.title ?? "Event"}</strong>
                <span>{event.event_type ?? "Calendar"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function HistoryPanel({ history }: { history: DashboardData["history"] }) {
  return (
    <section className={`${styles.panel} ${styles.historyPanel}`}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>History</p>
          <h2>7 Hari Terakhir</h2>
        </div>
      </div>
      <div style={s.historyTimelineList}>
        {history.map((m, idx) => {
          const dateObj = new Date(m.date + "T00:00:00");
          const dayName = dateObj.toLocaleDateString("id-ID", {
            weekday: "long",
          });
          const dayNum = dateObj.toLocaleDateString("id-ID", {
            day: "2-digit",
          });
          const monthNum = dateObj.toLocaleDateString("id-ID", {
            month: "2-digit",
          });

          return (
            <motion.div
              key={m.date}
              style={s.historyTimelineItem}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              whileHover={{ x: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
            >
              {/* Timeline dot */}
              <div style={s.timelineDot} />

              {/* Left: Date */}
              <div style={s.historyDateColumn}>
                <div style={s.historyDayName}>{dayName}</div>
                <div style={s.historyDayNum}>
                  {dayNum}/{monthNum}
                </div>
              </div>

              {/* Center: Emoji & Rating */}
              <div style={s.historyMoodColumn}>
                <div style={s.historyTimelineEmoji}>{EMOJI_MAP[m.rating]}</div>
                <div style={s.historyRatingColumn}>
                  <div
                    style={{
                      ...s.historyTimelineRating,
                      color: ratingColor(m.rating),
                    }}
                  >
                    {m.rating}/10
                  </div>
                  <div style={s.historyStreak}>Streak day: {m.streak_day}</div>
                </div>
              </div>

              {/* Right: XP */}
              <div style={s.historyXPColumn}>
                <div style={s.historyXPBadge}>+{m.xp_earned} XP</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function RewardShopModal({
  rewards,
  heartsBalance,
  selectedReward,
  rewardNotes,
  onSelectReward,
  onNoteChange,
  onClose,
  onRedeem,
}: {
  rewards: any[];
  heartsBalance: number;
  selectedReward: any | null;
  rewardNotes: Record<string, string>;
  onSelectReward: (rewardId: string) => void;
  onNoteChange: (rewardId: string, value: string) => void;
  onClose: () => void;
  onRedeem: (rewardId: string) => void;
}) {
  const selectedCost = Number(selectedReward?.cost_hearts ?? 0);
  const remainingHearts = heartsBalance - selectedCost;
  const canRedeemSelected = Boolean(selectedReward) && remainingHearts >= 0;

  return (
    <div
      className={styles.modalOverlay}
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className={styles.rewardModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-shop-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.eyebrow}>Reward shop</p>
            <h2 id="reward-shop-title">Tukar Hearts</h2>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            aria-label="Tutup"
          >
            X
          </button>
        </div>

        <div className={styles.modalWallet}>
          <div>
            <span>Hearts dimiliki</span>
            <strong>{heartsBalance}</strong>
          </div>
          <HeartStack count={heartsBalance} />
          {selectedReward && (
            <p>
              Biaya reward: {selectedCost} Hearts ·{" "}
              {remainingHearts >= 0
                ? `Sisa ${remainingHearts} Hearts`
                : `Kurang ${Math.abs(remainingHearts)} Hearts`}
            </p>
          )}
        </div>

        {rewards.length === 0 ? (
          <p style={s.emptyText}>Belum ada reward aktif.</p>
        ) : (
          <div className={styles.rewardPicker}>
            {rewards.map((reward) => (
              <RewardOptionButton
                key={reward.id}
                reward={reward}
                active={selectedReward?.id === reward.id}
                heartsBalance={heartsBalance}
                onClick={() => onSelectReward(reward.id)}
              />
            ))}
          </div>
        )}

        {selectedReward && (
          <>
            <label className={styles.reasonField}>
              <span>Alasannya apa nich?</span>
              <textarea
                value={rewardNotes[selectedReward.id] ?? ""}
                onChange={(event) =>
                  onNoteChange(selectedReward.id, event.target.value)
                }
                rows={4}
                placeholder="Kenapa mau reward ini hari ini?"
              />
            </label>

            <div className={styles.modalActions}>
              <p>
                Dipilih: <strong>{selectedReward.title}</strong>
              </p>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => onRedeem(selectedReward.id)}
                disabled={!canRedeemSelected}
              >
                {canRedeemSelected ? "Request Reward" : "Hearts belum cukup"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function RewardOptionButton({
  reward,
  active,
  heartsBalance,
  onClick,
}: {
  reward: any;
  active: boolean;
  heartsBalance: number;
  onClick: () => void;
}) {
  const cost = Number(reward.cost_hearts ?? 0);
  const remaining = heartsBalance - cost;

  return (
    <button
      type="button"
      className={active ? styles.rewardOptionActive : styles.rewardOption}
      onClick={onClick}
    >
      <span>
        <strong>{reward.title}</strong>
        <small>{reward.category ?? "Reward"}</small>
      </span>
      <em>
        <span>{cost} Hearts</span>
        <small
          className={
            remaining >= 0 ? styles.rewardAffordable : styles.rewardShort
          }
        >
          {remaining >= 0 ? "Cukup" : `Kurang ${Math.abs(remaining)}`}
        </small>
      </em>
    </button>
  );
}

function HeartStack({ count }: { count: number }) {
  const visibleHearts = Math.min(Math.max(0, Math.floor(count)), 10);

  return (
    <div className={styles.heartStack} aria-label={`${count} Hearts`}>
      {visibleHearts > 0 ? (
        Array.from({ length: visibleHearts }).map((_, index) => (
          <span key={index} aria-hidden="true">
            💗
          </span>
        ))
      ) : (
        <span aria-hidden="true">♡</span>
      )}
    </div>
  );
}

const GARDEN_STAGES = [
  "Bibit",
  "Bibit Kicik",
  "Tunas",
  "Daun Kicik",
  "Daun Besar",
  "Kuncup",
  "Sikit lagi mekar",
  "Mekar",
] as const;

const GARDEN_WATER_GOAL = 7;

const GARDEN_FLOWERS = [
  {
    type: "Tulip",
    accent: "#e8798f",
    soft: "#f7b5c1",
    core: "#f5c85f",
  },
  {
    type: "Daisy",
    accent: "#f7f0bf",
    soft: "#fff8d7",
    core: "#e5a93f",
  },
  {
    type: "Bluebell",
    accent: "#8bbbd9",
    soft: "#b9d9ea",
    core: "#f5c85f",
  },
  {
    type: "Clover",
    accent: "#9ccf7d",
    soft: "#c0e3a7",
    core: "#f4d36f",
  },
  {
    type: "Cosmos",
    accent: "#c58fd6",
    soft: "#ddbae9",
    core: "#f2c65f",
  },
  {
    type: "Sun",
    accent: "#e7cf6f",
    soft: "#f6e6a2",
    core: "#8f6032",
  },
] as const;

type GardenFlower = (typeof GARDEN_FLOWERS)[number];

type MoodGardenState = {
  title: string;
  stageLabel: string;
  statusTitle: string;
  statusCopy: string;
  ariaLabel: string;
  accent: string;
  progressPercent: number;
  progressRatio: number;
  stageIndex: number;
  isWilted: boolean;
  totalCheckIns: number;
  waterCount: number;
  waterGoal: number;
  bloomedFlowers: number;
  bloomShelfSize: number;
  activeFlower: GardenFlower;
  bloomEntries: GardenFlower[];
  nextBloomIn: number;
  penaltySteps: number;
  missedDays: number;
  recentItems: any[];
};

function buildMoodGarden(gardenItems: any[]): MoodGardenState {
  const moodItems = gardenItems
    .filter((item) => item?.source_type === "mood" || item?.mood_rating)
    .sort((a, b) =>
      String(a.earned_date ?? a.created_at ?? "").localeCompare(
        String(b.earned_date ?? b.created_at ?? ""),
      ),
    );
  const totalCheckIns = moodItems.length;

  let activeWaterCount = 0;
  let bloomedFlowers = 0;
  let lastMoodDate: string | null = null;
  let bloomedOnLastCheckIn = false;

  moodItems.forEach((item) => {
    const currentDate = readGardenDate(item);

    if (lastMoodDate && currentDate) {
      const missedBetween = Math.max(
        0,
        diffDateStrings(lastMoodDate, currentDate) - 1,
      );
      if (missedBetween > 0) {
        activeWaterCount = Math.max(0, activeWaterCount - 2);
      }
    }

    activeWaterCount += 1;
    bloomedOnLastCheckIn = false;

    if (activeWaterCount >= GARDEN_WATER_GOAL) {
      bloomedFlowers += 1;
      activeWaterCount = 0;
      bloomedOnLastCheckIn = true;
    }

    lastMoodDate = currentDate ?? lastMoodDate;
  });

  const lastDate = lastMoodDate;
  const missedDays = lastDate
    ? Math.max(0, diffDateStrings(lastDate, getJakartaDateString()) - 1)
    : 0;
  const penaltySteps =
    missedDays > 0 && activeWaterCount > 0 ? Math.min(activeWaterCount, 2) : 0;
  const waterCount =
    bloomedOnLastCheckIn && penaltySteps === 0
      ? GARDEN_WATER_GOAL
      : Math.max(0, activeWaterCount - penaltySteps);
  const stageIndex = Math.min(waterCount, GARDEN_WATER_GOAL);
  const isWilted = penaltySteps > 0;
  const activeFlower = GARDEN_FLOWERS[bloomedFlowers % GARDEN_FLOWERS.length];
  const accent = isWilted ? "#b8a088" : activeFlower.accent;
  const stageLabel = GARDEN_STAGES[stageIndex];
  const nextBloomIn = Math.max(0, GARDEN_WATER_GOAL - waterCount);
  const statusTitle =
    totalCheckIns === 0
      ? "Bibit siap ditanam"
      : isWilted
        ? "Layu sedikit, progress tetap aman"
        : waterCount === GARDEN_WATER_GOAL
          ? "Satu bunga berhasil mekar"
          : "Bunga-Bunga mood harian awaaa<3";
  const statusCopy =
    totalCheckIns === 0
      ? "Siraman pertaman nih, semangat sayaang xixixi."
      : isWilted
        ? "Tanamannya layu sikit nih huft, tapi aman masih bisa disiram lagi."
        : waterCount === GARDEN_WATER_GOAL
          ? "Bunga baru sudah masuk koleksi."
          : "Rawat pelan-pelan sampai kuncupnya jadi bunga penuh.";
  const bloomShelfSize = Math.max(3, Math.min(8, bloomedFlowers + 2));
  const bloomEntries = Array.from(
    { length: Math.max(1, bloomShelfSize) },
    (_, index) => GARDEN_FLOWERS[index % GARDEN_FLOWERS.length],
  );

  return {
    title:
      totalCheckIns === 0
        ? "Mood Garden"
        : isWilted
          ? "Recovery Garden"
          : waterCount === GARDEN_WATER_GOAL
            ? "Bloom Garden"
            : "Mood Garden",
    stageLabel,
    statusTitle,
    statusCopy,
    ariaLabel: `Tanaman mood tahap ${stageLabel}, ${waterCount} dari ${GARDEN_WATER_GOAL} siraman`,
    accent,
    progressPercent: Math.round((waterCount / GARDEN_WATER_GOAL) * 100),
    progressRatio: waterCount / GARDEN_WATER_GOAL,
    stageIndex,
    isWilted,
    totalCheckIns,
    waterCount,
    waterGoal: GARDEN_WATER_GOAL,
    bloomedFlowers,
    bloomShelfSize,
    activeFlower,
    bloomEntries,
    nextBloomIn,
    penaltySteps,
    missedDays,
    recentItems: [...gardenItems]
      .sort((a, b) =>
        String(b.earned_date ?? b.created_at ?? "").localeCompare(
          String(a.earned_date ?? a.created_at ?? ""),
        ),
      )
      .slice(0, 6),
  };
}

function readGardenDate(item: any): string | null {
  const value = item?.earned_date ?? item?.created_at;
  return typeof value === "string" ? value.slice(0, 10) : null;
}

function diffDateStrings(fromDate: string, toDate: string): number {
  const from = dateStringToUtc(fromDate);
  const to = dateStringToUtc(toDate);
  if (!from || !to) return 0;
  return Math.round((to - from) / 86400000);
}

function dateStringToUtc(value: string): number | null {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return Date.UTC(year, month - 1, day);
}

function gardenToolLabel(itemType: string) {
  if (itemType === "streak_shield") return "Shield";
  if (itemType === "forgiveness_ticket") return "Forgive";
  return itemType.replace(/_/g, " ");
}

function gardenEmoji(itemType: string) {
  if (itemType.includes("cloud")) return "\u2601\uFE0F";
  if (itemType.includes("tree")) return "\u{1F333}";
  if (itemType.includes("glowing")) return "\u{1F338}";
  if (itemType.includes("flower") || itemType.includes("bloom"))
    return "\u{1F337}";
  return "\u{1F331}";
}

// function LevelCard({ level }: { level: LevelProgressData }) {
//   return (
//     <section className={`${styles.panel} ${styles.levelPanel}`}>
//       <div style={s.levelHeader}>
//         <div>
//           <p style={s.kicker}>Love Level</p>
//           <h2 style={s.levelTitle}>
//             Level {level.currentLevel.levelNumber} -{" "}
//             {level.currentLevel.levelName}
//           </h2>
//         </div>
//         <span style={s.levelXP}>{level.totalXP} XP</span>
//       </div>
//       <div style={s.progressTrack}>
//         <div
//           style={{ ...s.progressFill, width: `${level.progressPercent}%` }}
//         />
//       </div>
//       <p style={s.progressText}>
//         {level.nextLevel
//           ? `${level.progressXP}/${level.requiredForNext} XP menuju ${level.nextLevel.levelName}`
//           : "Level maksimum, cintanya sudah endless."}
//       </p>
//     </section>
//   );
// }

function AlreadyDone({
  mood,
}: {
  mood: { rating: number; note: string | null; streak_day: number };
}) {
  return (
    <motion.div
      style={{ textAlign: "center", padding: "16px 0" }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <motion.span
        style={{ fontSize: 56, display: "inline-block" }}
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      >
        {EMOJI_MAP[mood.rating]}
      </motion.span>
      <motion.h3
        style={{ fontFamily: "Syne, sans-serif", marginTop: 12 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        YEAAY sudah direcord, nanti acuu pantauu yaa sayaangkuu 💗
      </motion.h3>
      <motion.p
        style={{ color: "var(--text-muted)", marginTop: 8, fontSize: 14 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        Mood:{" "}
        <strong style={{ color: ratingColor(mood.rating) }}>
          {mood.rating}/10
        </strong>
        {mood.streak_day > 1 && ` · 🔥 ${mood.streak_day} hari berturut-turut`}
      </motion.p>
      {mood.note && (
        <motion.p
          style={s.notePreview}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          &quot;{mood.note}&quot;
        </motion.p>
      )}
      <motion.p
        style={{ marginTop: 16, fontSize: 13, color: "var(--text-muted)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        jangan lupa besok isi lagi yyaa!!! 💕
      </motion.p>
    </motion.div>
  );
}

function ResultView({
  result,
}: {
  result: {
    message: string;
    streakDay: number;
    xpEarned: number;
    multiplier?: number;
  };
  onReset: () => void;
}) {
  return (
    <motion.div
      style={s.resultView}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <motion.p
        style={s.resultMessage}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {result.message}
      </motion.p>
      <motion.div
        style={s.resultChips}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <motion.span
          style={s.chip}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          +{result.xpEarned} XP
        </motion.span>
        {result.multiplier && result.multiplier > 1 && (
          <motion.span
            style={s.chip}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            {result.multiplier}x streak
          </motion.span>
        )}
        {result.streakDay > 1 && (
          <motion.span
            style={s.chip}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.35 }}
          >
            🔥 {result.streakDay} hari streak
          </motion.span>
        )}
      </motion.div>
    </motion.div>
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
    <section className={styles.panel}>
      <h2 style={s.cardTitle}>Mini-game Hari Ini</h2>
      {message && <p style={s.infoText}>{message}</p>}
      {miniGames.length === 0 ? (
        <p style={s.emptyText}>
          Belum ada mini-game aktif. Nanti admin bisa masukin kejutan kecil di
          sini.
        </p>
      ) : (
        <div style={s.gameList}>
          {miniGames.map((game) => {
            const completion = completions[game.id];
            const options = readStringList(game.options_json);

            return (
              <div key={game.id} style={s.gameCard}>
                <div style={s.gameHeader}>
                  <div>
                    <p style={s.kicker}>
                      {game.type} · {game.difficulty}
                    </p>
                    <h3 style={s.gameTitle}>{game.title}</h3>
                  </div>
                  <span style={s.gameXP}>
                    +{game.xp_reward} XP · +{game.hearts_reward ?? 0} Hearts
                  </span>
                </div>
                {game.description && (
                  <p style={s.gameDescription}>{game.description}</p>
                )}
                {game.prompt && <p style={s.gamePrompt}>{game.prompt}</p>}

                {completion?.is_correct ? (
                  <p style={s.doneText}>
                    Selesai · benar · +{completion.xp_earned} XP · +
                    {completion.hearts_earned ?? 0} Hearts
                  </p>
                ) : (
                  <>
                    {completion && (
                      <p style={s.infoText}>
                        TETOT, Salah kocak HAHAHAHA. Boleh coba lagi kok
                        xixixixi.
                      </p>
                    )}
                    {options.length > 0 ? (
                      <div style={s.optionGrid}>
                        {options.map((option, index) => (
                          <button
                            key={`${game.id}-option-${index}-${option}`}
                            type="button"
                            style={{
                              ...s.optionBtn,
                              ...(answers[game.id] === option
                                ? s.optionBtnActive
                                : {}),
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
                        onChange={(e) =>
                          onAnswerChange(game.id, e.target.value)
                        }
                        rows={2}
                      />
                    )}
                    <LoadingButton
                      style={s.secondaryBtn}
                      loading={submittingGameId === game.id}
                      onClick={() => onComplete(game.id)}
                    >
                      {completion ? "Coba Lagi" : "Selesaikan"}
                    </LoadingButton>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
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

  const targetTime = Date.now();
  const startTime = targetTime;
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
    color: "#a89a8f",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    paddingBottom: 10,
  },
  kicker: {
    color: "var(--text-muted)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  levelHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
  },
  levelTitle: {
    fontFamily: "Syne, sans-serif",
    fontSize: 16,
    lineHeight: 1.2,
  },
  levelXP: {
    color: "var(--accent)",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  progressTrack: {
    marginTop: 12,
    height: 8,
    borderRadius: 999,
    background: "var(--surface2)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "#a89a8f",
  },
  progressText: {
    marginTop: 6,
    color: "var(--text-muted)",
    fontSize: 11,
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
  sliderWrap: { marginBottom: 12 },
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
  spaciousHistoryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 12,
    marginTop: 8,
  },
  spaciousHistoryItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    padding: "16px 12px",
    background: "rgba(255, 253, 251, 0.6)",
    border: "1px solid rgba(139, 124, 111, 0.12)",
    borderRadius: 14,
    backdropFilter: "blur(12px)",
    cursor: "pointer",
    transition: "all 0.2s ease",
  } as React.CSSProperties,
  historyMoodEmoji: {
    fontSize: 36,
    lineHeight: 1,
  },
  historyInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    textAlign: "center",
  } as React.CSSProperties,
  historyDate: {
    fontSize: 11,
    color: "var(--text-muted)",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  } as React.CSSProperties,
  historyRating: {
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "Syne, sans-serif",
  },
  historyXP: {
    fontSize: 10,
    color: "#8b7c6f",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  } as React.CSSProperties,
  historyTimelineList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginTop: 12,
  } as React.CSSProperties,
  historyTimelineItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 12px",
    background: "rgba(255, 253, 251, 0.6)",
    border: "1px solid rgba(139, 124, 111, 0.12)",
    borderRadius: 12,
    backdropFilter: "blur(12px)",
    cursor: "pointer",
    transition: "all 0.2s ease",
    position: "relative",
  } as React.CSSProperties,
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#a89a8f",
    flexShrink: 0,
    boxShadow: "0 0 0 3px rgba(168, 154, 143, 0.08)",
  } as React.CSSProperties,
  historyDateColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    minWidth: 58,
    flexShrink: 0,
  } as React.CSSProperties,
  historyDayName: {
    fontSize: 9,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    fontWeight: 500,
    lineHeight: 1,
  } as React.CSSProperties,
  historyDayNum: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text)",
    lineHeight: 1,
  } as React.CSSProperties,
  historyMoodColumn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  } as React.CSSProperties,
  historyTimelineEmoji: {
    fontSize: 28,
    lineHeight: 1,
    flexShrink: 0,
  } as React.CSSProperties,
  historyRatingColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  } as React.CSSProperties,
  historyTimelineRating: {
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "Syne, sans-serif",
    lineHeight: 1,
  } as React.CSSProperties,
  historyStreak: {
    fontSize: 9,
    color: "var(--text-muted)",
    fontWeight: 500,
    lineHeight: 1,
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  historyXPColumn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minWidth: 65,
    justifyContent: "flex-end",
    flexShrink: 0,
  } as React.CSSProperties,
  historyXPBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: "#a89a8f",
    backgroundColor: "rgba(168, 154, 143, 0.1)",
    padding: "5px 10px",
    borderRadius: 6,
    border: "1px solid rgba(139, 124, 111, 0.15)",
    whiteSpace: "nowrap",
  } as React.CSSProperties,
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
    color: "#a89a8f",
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
    color: "#a89a8f",
    fontSize: 13,
    fontWeight: 700,
  },
  gardenGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: 6,
    marginTop: 8,
  },
  gardenTile: {
    aspectRatio: "1",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    fontSize: 22,
  },
  calendarRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px solid var(--border)",
    color: "var(--text-muted)",
    fontSize: 13,
  },
  birthdayCard: {
    position: "relative",
    overflow: "hidden",
    padding: 22,
    borderRadius: "calc(var(--radius) + 4px)",
    border: "1px solid rgba(139, 124, 111, 0.15)",
    background: "rgba(255, 253, 251, 0.7)",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
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
    color: "#3d3d3d",
  },
  birthdayGlow: {
    position: "absolute",
    inset: "auto -30px -60px auto",
    width: 150,
    height: 150,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(139, 124, 111, 0.15) 0%, transparent 70%)",
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
    background: "rgba(255, 253, 251, 0.6)",
    border: "1px solid rgba(139, 124, 111, 0.12)",
  },
  countdownValue: {
    fontFamily: "Quicksand, sans-serif",
    fontSize: 34,
    fontWeight: 800,
    lineHeight: 1,
    color: "#3d3d3d",
  },
  countdownLabel: {
    fontSize: 12,
    color: "#8b7c6f",
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
    background: "#a89a8f",
    color: "#fefdfb",
    fontFamily: "Quicksand, sans-serif",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
  },
};
