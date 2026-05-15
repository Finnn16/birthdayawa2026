"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
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

const moodEmoji = ["😔", "🥺", "😐", "🙂", "😊", "🥰", "🤭", "😌", "✨", "💖"];

const quests = [
  {
    title: "Tiny reflection",
    prompt: "Apa satu hal kecil yang bikin hari ini terasa lebih baik?",
    reward: "+12 Hearts",
    tone: "soft",
  },
  {
    title: "Memory spark",
    prompt: "Pilih momen yang paling kamu ingat dari minggu ini.",
    reward: "+20 XP",
    tone: "gold",
  },
];

const rewards = [
  { title: "Voice note penyemangat", cost: "45 Hearts", status: "Ready" },
  {
    title: "Request surat panjang",
    cost: "120 Hearts",
    status: "Pending approval",
  },
  { title: "Streak Shield", cost: "90 Hearts", status: "Locked" },
];

const garden = [
  "sprout",
  "bloom",
  "tree",
  "cloud",
  "bloom",
  "spark",
  "sprout",
  "tree",
];

const calendar = [
  { date: "13 Mei", title: "Daily quest aktif", meta: "Hari ini" },
  { date: "18 Mei", title: "Movie night request", meta: "Reward" },
  { date: "25 Mei", title: "Birthday countdown", meta: "Special" },
];

export default function TestDashboardPage() {
  const [mood, setMood] = useState(8);
  const [note, setNote] = useState("");
  const [shopOpen, setShopOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState(rewards[0]);
  const [rewardReason, setRewardReason] = useState("");

  const moodLabel = useMemo(() => moodLabels[mood - 1] ?? "Hangat", [mood]);
  const currentEmoji = moodEmoji[mood - 1] ?? "😊";
  const moodColor = mood <= 3 ? "#ff7c76" : mood <= 6 ? "#f3c969" : "#77d7b9";
  const rewardPreview = "+35 XP";

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.statusDock} aria-label="Progress ringkas">
          <StatusPill icon="💞" label="Level" value="Warm Hug" />
          <StatusPill icon="⚡" label="XP" value="340/540" />
          <StatusPill icon="🔥" label="Streak" value="14" />
          <StatusPill icon="✨" label="Multiplier" value="7x" />
        </div>
        <div className={styles.profile}>
          <span>@Awa</span>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Logout"
          >
            L
          </button>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCountdown}>
          <p className={styles.eyebrow}>Birthday countdown</p>
          <h1>12 hari lagi</h1>
          <div className={styles.countdown} aria-label="Birthday countdown">
            <TimeBox value="12" label="Hari" />
            <TimeBox value="08" label="Jam" />
            <TimeBox value="24" label="Menit" />
            <TimeBox value="16" label="Detik" />
          </div>
        </div>
        <div className={styles.heroCopy}>
          <h2>Jaga mood, kumpulin Hearts, dan rawat garden pelan-pelan.</h2>
          <p>
            Hari ini cukup isi mood dulu. Quest dan reward bisa menyusul
            setelahnya.
          </p>
        </div>
      </section>

      <section className={styles.layout}>
        <div className={styles.primaryColumn}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Mood check-in</p>
                <h2>Gimana hari ini?</h2>
              </div>
              <span className={styles.moodBadge}>{moodLabel}</span>
            </div>

            <div className={styles.moodStage}>
              <div className={styles.moodEmoji} aria-hidden="true">
                {currentEmoji}
              </div>
              <div>
                <strong>{mood}/10</strong>
                <span>{moodLabel}</span>
              </div>
            </div>

            <div className={styles.sliderWrap}>
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
              <div className={styles.sliderMeta}>
                <span>1</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>

            <textarea
              className={styles.note}
              placeholder="Tulis sedikit cerita hari ini..."
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
            />

            <div className={styles.actionRow}>
              <button type="button" className={styles.primaryButton}>
                Simpan Mood
              </button>
              <p>Reward streak: {rewardPreview}</p>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Daily quest</p>
                <h2>Quest hari ini</h2>
              </div>
              <button type="button" className={styles.ghostButton}>
                Lihat semua
              </button>
            </div>

            <div className={styles.questList}>
              {quests.map((quest) => (
                <article
                  key={quest.title}
                  className={`${styles.questCard} ${styles[quest.tone]}`}
                >
                  <div>
                    <h3>{quest.title}</h3>
                    <p>{quest.prompt}</p>
                  </div>
                  <button type="button">{quest.reward}</button>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Reward shop</p>
                <h2>Request reward</h2>
              </div>
            </div>
            <div className={styles.shopPreview}>
              <strong>186 Hearts tersedia</strong>
              <p>Pilih reward lewat popup supaya dashboard tetap lega.</p>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => setShopOpen(true)}
              >
                Buka Reward Shop
              </button>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Mood garden</p>
                <h2>Garden preview</h2>
              </div>
            </div>
            <div className={styles.gardenGrid}>
              {garden.map((item, index) => (
                <div key={`${item}-${index}`} className={styles.gardenTile}>
                  {gardenIcon(item)}
                </div>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Couple calendar</p>
                <h2>Agenda dekat</h2>
              </div>
            </div>
            <div className={styles.calendarList}>
              {calendar.map((event) => (
                <div key={event.title} className={styles.calendarRow}>
                  <time>{event.date}</time>
                  <div>
                    <strong>{event.title}</strong>
                    <span>{event.meta}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      {shopOpen && (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={() => setShopOpen(false)}
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
                onClick={() => setShopOpen(false)}
                aria-label="Tutup"
              >
                X
              </button>
            </div>

            <div className={styles.rewardPicker}>
              {rewards.map((reward) => (
                <button
                  key={reward.title}
                  type="button"
                  className={
                    selectedReward.title === reward.title
                      ? styles.rewardOptionActive
                      : styles.rewardOption
                  }
                  onClick={() => setSelectedReward(reward)}
                >
                  <span>
                    <strong>{reward.title}</strong>
                    <small>{reward.status}</small>
                  </span>
                  <em>{reward.cost}</em>
                </button>
              ))}
            </div>

            <label className={styles.reasonField}>
              <span>Reason optional</span>
              <textarea
                value={rewardReason}
                onChange={(event) => setRewardReason(event.target.value)}
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
                onClick={() => setShopOpen(false)}
              >
                Request Reward
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function StatusPill({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className={styles.statusPill} title={`${label}: ${value}`}>
      <span aria-hidden="true">{icon}</span>
      <small>{value}</small>
    </div>
  );
}

function TimeBox({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.timeBox}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function gardenIcon(item: string) {
  if (item === "cloud") return "C";
  if (item === "tree") return "T";
  if (item === "spark") return "*";
  if (item === "bloom") return "B";
  return "S";
}
