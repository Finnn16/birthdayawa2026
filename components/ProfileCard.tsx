"use client";

import { useState } from "react";
import styles from "./ProfileCard.module.css";

export interface ProfileStat {
  label: string;
  value: string;
}

export interface ProfileCardProps {
  username?: string;
  level?: string;
  progress?: number;
  maxProgress?: number;
  tag?: string;
  avatarColor?: string;
  iconColor?: string;
  stats?: ProfileStat[];
  onLogout?: () => void;
  logoutLoading?: boolean;
}

export default function ProfileCard({
  username = "Username",
  level = "Level 3 - Deep",
  progress = 95,
  maxProgress = 100,
  tag = "#BESTGF",
  avatarColor = "#a89a8f",
  iconColor = "#a89a8f",
  onLogout,
  logoutLoading = false,
  stats = [
    { label: "Streaks", value: "0 hari" },
    { label: "Level", value: "Lv 1" },
    { label: "Multiplier", value: "1x" },
  ],
}: ProfileCardProps) {
  const [expanded, setExpanded] = useState(false);
  const safeMax = Math.max(1, maxProgress);
  const progressPercentage = Math.min(
    100,
    Math.max(0, (progress / safeMax) * 100),
  );
  const initials = username.replace(/^@/, "").trim().slice(0, 2).toUpperCase();

  return (
    <section
      className={`${styles.card} ${expanded ? styles.expanded : ""}`}
      aria-label="Profile progress"
      aria-expanded={expanded}
      tabIndex={0}
      onClick={() => setExpanded((current) => !current)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpanded((current) => !current);
        }
      }}
    >
      <div className={styles.userInfo}>
        <div className={styles.avatar} style={{ background: avatarColor }}>
          {initials || "U"}
        </div>
        <div className={styles.identity}>
          <h2>{username}</h2>
          <p>{level}</p>
        </div>
        <span className={styles.expandIcon} aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
        {onLogout && (
          <button
            type="button"
            className={styles.logoutButton}
            onClick={(event) => {
              event.stopPropagation();
              onLogout();
            }}
            disabled={logoutLoading}
            aria-label="Keluar"
            title="Keluar"
          >
            {logoutLoading ? (
              <span className={styles.logoutSpinner} aria-hidden="true" />
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
              >
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M21 3v18" />
              </svg>
            )}
          </button>
        )}
      </div>

      <div className={styles.details}>
        <div className={styles.progressBlock}>
          <div className={styles.progressTrack} aria-hidden="true">
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p>
            <span>{progress}/{safeMax} XP</span>
            <strong>{Math.round(progressPercentage)}%</strong>
          </p>
        </div>

        <div className={styles.footer}>
          <span className={styles.tag}>{tag}</span>
          <div className={styles.stats}>
            {stats.map((stat) => (
              <div className={styles.stat} key={stat.label}>
                <span
                  className={styles.statIcon}
                  style={{ background: iconColor }}
                  aria-hidden="true"
                />
                <span className={styles.statText}>
                  <strong>{stat.value}</strong>
                  <small>{stat.label}</small>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
