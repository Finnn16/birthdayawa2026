import React from "react";
import { type CalendarDay } from "@/lib/mood-types";

interface CalendarGridProps {
  days: CalendarDay[];
  getEmoji?: (rating: number) => string;
  getCellTitle?: (day: CalendarDay) => string;
  cellClassName?: string;
  cellStyle?: (rating: number) => React.CSSProperties;
  weekDayLabels?: string[];
  showLegend?: boolean;
  containerClassName?: string;
}

/**
 * Generic Calendar Grid Component
 * Menampilkan kalender 12 minggu dalam format grid
 * Styling dan content via props - fully customizable
 */
export function CalendarGrid({
  days,
  getEmoji = () => "",
  getCellTitle = (day) => day.date,
  cellClassName = "",
  cellStyle = () => ({}),
  weekDayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"],
  showLegend = true,
  containerClassName = "",
}: CalendarGridProps) {
  const WEEKS = 12;

  return (
    <div className={containerClassName}>
      <div
        style={{
          display: "flex",
          gap: "4px",
          overflowX: "auto",
          paddingBottom: 8,
        }}
      >
        {/* Day labels */}
        <div
          style={{
            display: "grid",
            gridTemplateRows: "repeat(7, 36px)",
            gap: 4,
          }}
        >
          {weekDayLabels.map((d) => (
            <span
              key={d}
              style={{
                fontSize: 11,
                opacity: 0.5,
                display: "flex",
                alignItems: "center",
                height: 36,
              }}
            >
              {d}
            </span>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: "flex", gap: "4px" }}>
          {Array.from({ length: WEEKS }, (_, weekIdx) => (
            <div
              key={weekIdx}
              style={{ display: "flex", flexDirection: "column", gap: 4 }}
            >
              {days.slice(weekIdx * 7, weekIdx * 7 + 7).map((day, i) => (
                <div
                  key={i}
                  title={getCellTitle(day)}
                  className={cellClassName}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "default",
                    flexShrink: 0,
                    ...cellStyle(day.rating),
                  }}
                >
                  {day.rating > 0 && (
                    <span style={{ fontSize: 14 }}>{getEmoji(day.rating)}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
