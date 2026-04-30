"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAdminData } from "@/app/hooks/useAdminData";
import {
  buildCalendarData,
  getMoodsWithNotes,
  formatDate,
} from "@/lib/calendar-utils";
import {
  getRatingColor,
  getRatingBg,
  getRatingEmoji,
  ADMIN_STYLES,
  LEGEND_DATA,
} from "@/lib/admin-theme";
import { StatCard } from "@/components/common/StatCard";
import { CalendarGrid } from "@/components/common/CalendarGrid";
import { NotesList } from "@/components/common/NotesList";
import { HistoryList } from "@/components/common/HistoryList";

export default function AdminDashboard() {
  const router = useRouter();
  const { moods, stats, userInfo, loading, error } = useAdminData();
  const [activeTab, setActiveTab] = useState<"calendar" | "notes" | "history">(
    "calendar",
  );

  // Memoize kalender agar tidak recalculate setiap render
  const calendarData = useMemo(() => buildCalendarData(moods), [moods]);
  const moodsWithNotes = useMemo(() => getMoodsWithNotes(moods), [moods]);

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <p
          style={{
            color: "var(--text-muted)",
            fontFamily: "Syne, sans-serif",
            fontSize: 18,
          }}
        >
          loading data...
        </p>
      </div>
    );

  if (error)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <p style={{ color: "var(--red)", fontFamily: "Syne, sans-serif" }}>
          {error}
        </p>
      </div>
    );

  return (
    <div style={ADMIN_STYLES.page}>
      {/* Header */}
      <div style={ADMIN_STYLES.header}>
        <div>
          <div style={ADMIN_STYLES.headerTop}>
            <span style={ADMIN_STYLES.logo}>🌡 MoodTrack</span>
            <span style={ADMIN_STYLES.adminBadge}>ADMIN</span>
          </div>
          <p style={ADMIN_STYLES.headerSub}>
            Dashboard mood untuk{" "}
            <strong style={{ color: "var(--accent)" }}>
              @{userInfo?.username ?? "..."}
            </strong>
          </p>
        </div>
        <button
          style={ADMIN_STYLES.backBtn}
          onClick={() => router.push("/dashboard")}
        >
          ← Balik
        </button>
      </div>

      <div style={ADMIN_STYLES.container}>
        {/* Stats row */}
        {stats && (
          <div style={ADMIN_STYLES.statsGrid}>
            <StatCard
              label="Rata-rata Mood"
              value={`${stats.avgRating}/10`}
              emoji={getRatingEmoji(Math.round(stats.avgRating))}
              color={getRatingColor(Math.round(stats.avgRating))}
              style={{
                ...ADMIN_STYLES.statCard,
                borderColor: getRatingColor(Math.round(stats.avgRating)) + "30",
              }}
            />
            <StatCard
              label="Total Hari"
              value={`${stats.totalDays} hari`}
              emoji="📅"
              color="var(--blue)"
              style={{
                ...ADMIN_STYLES.statCard,
                borderColor: "var(--blue)30",
              }}
            />
            <StatCard
              label="Streak Sekarang"
              value={`${stats.currentStreak} hari`}
              emoji="🔥"
              color="#ff9f57"
              style={{
                ...ADMIN_STYLES.statCard,
                borderColor: "#ff9f5730",
              }}
            />
            <StatCard
              label="Total XP"
              value={`${stats.totalXP} XP`}
              emoji="⚡"
              color="var(--accent)"
              style={{
                ...ADMIN_STYLES.statCard,
                borderColor: "var(--accent)30",
              }}
            />
            <StatCard
              label="Mood Terbaik"
              value={`${stats.highestRating}/10`}
              emoji="👑"
              color="var(--accent)"
              style={{
                ...ADMIN_STYLES.statCard,
                borderColor: "var(--accent)30",
              }}
            />
            <StatCard
              label="Mood Terendah"
              value={`${stats.lowestRating}/10`}
              emoji="💙"
              color="var(--red)"
              style={{
                ...ADMIN_STYLES.statCard,
                borderColor: "var(--red)30",
              }}
            />
          </div>
        )}

        {/* Tabs */}
        <div style={ADMIN_STYLES.tabs}>
          {(["calendar", "notes", "history"] as const).map((tab) => (
            <button
              key={tab}
              style={{
                ...ADMIN_STYLES.tab,
                ...(activeTab === tab ? ADMIN_STYLES.tabActive : {}),
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "calendar" && "📆 Calendar"}
              {tab === "notes" && `📝 Notes (${moodsWithNotes.length})`}
              {tab === "history" && "📋 History"}
            </button>
          ))}
        </div>

        {/* CALENDAR TAB */}
        {activeTab === "calendar" && (
          <div style={ADMIN_STYLES.card}>
            <h2 style={ADMIN_STYLES.cardTitle}>
              Mood Calendar — 12 Minggu Terakhir
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
              weekDayLabels={["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]}
            />

            {/* Legend */}
            <div style={ADMIN_STYLES.legend}>
              {LEGEND_DATA.map((l) => (
                <div key={l.label} style={ADMIN_STYLES.legendItem}>
                  <div
                    style={{
                      ...ADMIN_STYLES.legendDot,
                      background: l.color + "40",
                      border: `1px solid ${l.color}60`,
                    }}
                  />
                  <span>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === "notes" && (
          <div style={ADMIN_STYLES.card}>
            <h2 style={ADMIN_STYLES.cardTitle}>Catatan Harian</h2>
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

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div style={ADMIN_STYLES.card}>
            <h2 style={ADMIN_STYLES.cardTitle}>Semua History</h2>
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
              rowStyle={(mood) => ({
                borderBottomColor: getRatingBg(mood.rating),
              })}
              emptyMessage="Belum ada data mood."
            />
          </div>
        )}
      </div>
    </div>
  );
}
