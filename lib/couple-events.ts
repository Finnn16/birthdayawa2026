export const COUPLE_EVENT_TYPES = [
  { value: "custom", label: "Custom" },
  { value: "birthday", label: "Birthday" },
  { value: "date", label: "Date" },
  { value: "movie", label: "Movie / Nonton" },
  { value: "dinner", label: "Dinner / Makan" },
  { value: "anniversary", label: "Anniversary" },
  { value: "reminder", label: "Reminder" },
  { value: "special_day", label: "Special day" },
] as const;

export type CoupleEventType = (typeof COUPLE_EVENT_TYPES)[number]["value"];

export function isCoupleEventType(value: unknown): value is CoupleEventType {
  return (
    typeof value === "string" &&
    COUPLE_EVENT_TYPES.some((eventType) => eventType.value === value)
  );
}

export function normalizeCoupleEventType(value: unknown): CoupleEventType {
  return isCoupleEventType(value) ? value : "custom";
}
