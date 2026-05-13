import React, { useState } from "react";
import { type Mood } from "@/lib/mood-types";

interface NotesListProps {
  moods: Mood[];
  getEmoji?: (rating: number) => string;
  formatDate?: (date: string) => string;
  getRatingColor?: (rating: number) => string;
  itemClassName?: string;
  itemStyle?: (mood: Mood, isSelected: boolean) => React.CSSProperties;
  emptyMessage?: string;
}

export function NotesList({
  moods,
  getEmoji = () => "",
  formatDate = (d) => d,
  getRatingColor = () => "inherit",
  itemClassName = "",
  itemStyle = () => ({}),
  emptyMessage = "Tidak ada catatan.",
}: NotesListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (moods.length === 0) {
    return <p style={{ fontSize: 14, opacity: 0.6 }}>{emptyMessage}</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {moods.map((mood) => {
        const isSelected = selectedId === mood.id;

        return (
          <div
            key={mood.id}
            className={itemClassName}
            style={{
              borderRadius: 12,
              padding: "14px 16px",
              cursor: "pointer",
              transition: "opacity 0.2s",
              ...itemStyle(mood, isSelected),
            }}
            onClick={() => setSelectedId(isSelected ? null : mood.id)}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 22 }}>{getEmoji(mood.rating)}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {formatDate(mood.date)}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>
                    Mood:{" "}
                    <span
                      style={{
                        color: getRatingColor(mood.rating),
                        fontWeight: 700,
                      }}
                    >
                      {mood.rating}/10
                    </span>
                    {mood.streak_day > 1 &&
                      ` · 🔥 ${mood.streak_day} hari streak`}
                  </div>
                </div>
              </div>
              <span style={{ opacity: 0.5, fontSize: 12 }}>
                {isSelected ? "▲" : "▼"}
              </span>
            </div>

            {isSelected && mood.note && (
              <p
                style={{
                  marginTop: 12,
                  fontSize: 14,
                  lineHeight: 1.6,
                  fontStyle: "italic",
                  paddingLeft: 4,
                }}
              >
                &quot;{mood.note}&quot;
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
