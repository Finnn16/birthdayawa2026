import React from "react";

interface StatCardProps {
  label: string;
  value: string;
  emoji: string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Generic Stats Card Component
 * Reusable di berbagai project - styling via className atau style prop
 */
export function StatCard({
  label,
  value,
  emoji,
  color,
  className = "",
  style,
}: StatCardProps) {
  return (
    <div className={className} style={style}>
      <span style={{ fontSize: 24 }}>{emoji}</span>
      <div>
        <div
          style={{
            fontSize: 11,
            opacity: 0.6,
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            fontFamily: "'Syne', sans-serif",
            color,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
