"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { ReactNode } from "react";
import styles from "./test-dashboard.module.css";

const moodLabels = [
  "Berat",
  "Pelan",
  "Cukup",
  "Hangat",
  "Bahagia",
  "Bersinar",
  "Manja",
  "Tenang",
  "Semangat",
  "Full love",
];

const metrics = [
  { label: "XP", value: "340/540", icon: "XP" },
  { label: "Streak", value: "14 hari", icon: "ST" },
  { label: "Hearts", value: "186", icon: "HT" },
];

const countdown = [
  { value: "09", label: "Hari" },
  { value: "12", label: "Jam" },
  { value: "55", label: "Menit" },
  { value: "13", label: "Detik" },
];

const quests = [
  {
    title: "Tiny reflection",
    prompt: "Apa satu hal kecil yang bikin hari ini terasa lebih baik?",
    reward: "+12 Hearts",
  },
  {
    title: "Memory spark",
    prompt: "Pilih momen yang paling kamu ingat dari minggu ini.",
    reward: "+20 XP",
  },
];

const rewards = [
  { title: "Voice note", meta: "45 Hearts" },
  { title: "Surat panjang", meta: "120 Hearts" },
  { title: "Streak Shield", meta: "90 Hearts" },
];

const calendar = [
  { date: "18 Mei", title: "Movie night request" },
  { date: "25 Mei", title: "Ulang Tahun Awa" },
];

type TaskTab = "mood" | "quest" | "minigame";

export default function TestDashboardPage() {
  const [activeTask, setActiveTask] = useState<TaskTab>("mood");
  const [mood, setMood] = useState(8);
  const [note, setNote] = useState("");

  const moodLabel = useMemo(() => moodLabels[mood - 1] ?? "Hangat", [mood]);
  const moodColor = mood <= 3 ? "#ff7c76" : mood <= 6 ? "#f3c969" : "#77d7b9";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>BirthdayAwa</p>
            <h1>Hari ini</h1>
          </div>
          <div className={styles.profileActions}>
            <span>@Awa</span>
            <button
              type="button"
              className={styles.avatar}
              aria-label="Profil Awa"
            >
              A
            </button>
          </div>
        </header>

        <section className={styles.goldenOverview}>
          <section className={styles.heroStrip}>
            <div className={styles.heroCopy}>
              <p>Birthday countdown</p>
              <h2>9 hari lagi</h2>
              <span>Ulang Tahun Awa - 25 Mei 2026</span>
            </div>
            <div
              className={styles.countdownGrid}
              aria-label="Birthday countdown"
            >
              {countdown.map((item) => (
                <div key={item.label} className={styles.timeCell}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section
            className={styles.progressDock}
            aria-label="Progress ringkas"
          >
            <article className={styles.levelStrip}>
              <div className={styles.levelContent}>
                <span>Love level</span>
                <strong>Warm Hug</strong>
                <small>340 / 540 XP</small>
              </div>
              <div className={styles.levelProgress}>
                <div className={styles.levelTrack} aria-hidden="true">
                  <div style={{ width: "63%" }} />
                </div>
                <small>200 XP lagi</small>
              </div>
            </article>

            <div className={styles.metricsGrid}>
              {metrics.map((item) => (
                <article key={item.label} className={styles.metricCard}>
                  <span aria-hidden="true">{item.icon}</span>
                  <small>{item.label}</small>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section className={styles.goldenWorkspace}>
          <section className={styles.todayPanel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Daily hub</p>
                <h2>Satu fokus dulu</h2>
              </div>
              <span className={styles.rewardBadge}>+35 XP ready</span>
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

            {activeTask === "mood" && (
              <div className={styles.taskBody}>
                <div className={styles.moodSummary}>
                  <div className={styles.moodNumber}>{mood}</div>
                  <div>
                    <strong>{moodLabel}</strong>
                    <span>Isi mood harian tanpa buka halaman panjang.</span>
                  </div>
                </div>
                <input
                  className={styles.moodSlider}
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={mood}
                  onChange={(event) => setMood(Number(event.target.value))}
                  style={
                    {
                      "--mood-progress": `${((mood - 1) / 9) * 100}%`,
                      "--mood-color": moodColor,
                    } as CSSProperties
                  }
                  aria-label="Pilih mood hari ini"
                />
                <textarea
                  className={styles.note}
                  placeholder="Catatan singkat hari ini..."
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                />
                <button type="button" className={styles.primaryButton}>
                  Simpan mood
                </button>
              </div>
            )}

            {activeTask === "quest" && (
              <div className={styles.taskBody}>
                {quests.map((quest) => (
                  <article key={quest.title} className={styles.questCard}>
                    <div>
                      <strong>{quest.title}</strong>
                      <p>{quest.prompt}</p>
                    </div>
                    <span>{quest.reward}</span>
                  </article>
                ))}
                <button type="button" className={styles.primaryButton}>
                  Kerjakan quest
                </button>
              </div>
            )}

            {activeTask === "minigame" && (
              <div className={styles.taskBody}>
                <article className={styles.miniGameCard}>
                  <span>Guess the date - Medium</span>
                  <strong>Tebak tanggal date</strong>
                  <p>Tanggal berapa kita date di Miko Mall?</p>
                  <input type="text" placeholder="Contoh: 12-01-2022" />
                </article>
                <button type="button" className={styles.primaryButton}>
                  Jawab mini-game
                </button>
              </div>
            )}
          </section>

          <section
            className={styles.exploreSection}
            aria-label="Eksplorasi lain"
          >
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>Explore</p>
                <h2>Yang bisa dicek nanti</h2>
              </div>
              <span>Swipe di mobile</span>
            </div>

            <div className={styles.featureRail}>
              <FeaturePanel title="Reward shop" action="Buka shop" tone="mint">
                <div className={styles.rewardHero}>
                  <span>Hearts tersedia</span>
                  <strong>186</strong>
                </div>
                <div className={styles.rewardList}>
                  {rewards.map((reward) => (
                    <span key={reward.title}>
                      <strong>{reward.title}</strong>
                      <small>{reward.meta}</small>
                    </span>
                  ))}
                </div>
              </FeaturePanel>

              <FeaturePanel title="Couple calendar" action="Detail" tone="blue">
                <div className={styles.calendarList}>
                  {calendar.map((event) => (
                    <span key={event.title}>
                      <time>{event.date}</time>
                      <strong>{event.title}</strong>
                    </span>
                  ))}
                </div>
                <p className={styles.featureNote}>
                  Event terdekat jadi sumber countdown, quest harian tidak masuk
                  ke sini.
                </p>
              </FeaturePanel>

              <FeaturePanel title="Mood garden" action="Rawat" tone="rose">
                <div className={styles.gardenPlot}>
                  <span>S</span>
                  <span>B</span>
                  <span>T</span>
                  <span>*</span>
                  <span>B</span>
                  <span>S</span>
                </div>
                <p className={styles.featureNote}>
                  Garden tumbuh dari mood check-in, jadi progressnya terasa
                  pelan tapi konsisten.
                </p>
              </FeaturePanel>

              <FeaturePanel title="Love log" action="Lihat log" tone="gold">
                <div className={styles.logList}>
                  <span>
                    <strong>Hari ini</strong>
                    <small>Mood check-in siap diisi</small>
                  </span>
                  <span>
                    <strong>Minggu ini</strong>
                    <small>3 aktivitas selesai, streak aman</small>
                  </span>
                </div>
              </FeaturePanel>
            </div>
          </section>
        </section>
      </div>
    </main>
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
    <button
      type="button"
      className={active ? styles.segmentActive : styles.segmentButton}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function FeaturePanel({
  title,
  action,
  tone,
  children,
}: {
  title: string;
  action: string;
  tone: "mint" | "blue" | "rose" | "gold";
  children: ReactNode;
}) {
  return (
    <article className={`${styles.featurePanel} ${styles[tone]}`}>
      <div className={styles.featureHeader}>
        <h3>{title}</h3>
        <button type="button">{action}</button>
      </div>
      {children}
    </article>
  );
}
