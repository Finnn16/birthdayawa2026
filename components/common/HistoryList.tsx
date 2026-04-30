import React from "react";
import { type Mood } from "@/lib/mood-types";
import { CALENDAR_CONFIG } from "@/lib/mood-types";

interface HistoryListProps {
  moods: Mood[];
  getEmoji?: (rating: number) => string;
  formatDate?: (date: string) => string;
  getRatingColor?: (rating: number) => string;
  rowClassName?: string;
  rowStyle?: (mood: Mood) => React.CSSProperties;
  emptyMessage?: string;
}

/**
 * Generic History List Component
 * Menampilkan list semua mood records
 */
export function HistoryList({
  moods,
  getEmoji = () => "",
  formatDate = (d) => d,
  getRatingColor = () => "inherit",
  rowClassName = "",
  rowStyle = () => ({}),
  emptyMessage = "Tidak ada data.",
}: HistoryListProps) {
  if (moods.length === 0) {
    return <p style={{ fontSize: 14, opacity: 0.6 }}>{emptyMessage}</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {moods.map((mood) => {
        const truncatedNote =
          mood.note && mood.note.length > CALENDAR_CONFIG.NOTE_PREVIEW_LENGTH
            ? mood.note.slice(0, CALENDAR_CONFIG.NOTE_PREVIEW_LENGTH) + "..."
            : mood.note;

        return (
          <div
            key={mood.id}
            className={rowClassName}
            style={{
              display: "flex",
              gap: 14,
              alignItems: "center",
              padding: "12px 0",
              borderBottom: "1px solid",
              borderBottomColor: "rgba(0,0,0,0.1)",
              ...rowStyle(mood),
            }}
          >
            <span style={{ fontSize: 24, minWidth: 32 }}>
              {getEmoji(mood.rating)}
            </span>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>
                {formatDate(mood.date)}
              </div>
              {truncatedNote && (
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
                  {truncatedNote}
                </div>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  color: getRatingColor(mood.rating),
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                {mood.rating}/10
              </div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>
                +{mood.xp_earned} XP
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
