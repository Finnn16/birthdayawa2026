import { APP_TIME_ZONE } from "@/lib/app-config";

export function getTodayDateString(date = new Date(), timeZone = APP_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00+07:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

export function toJakartaMidnight(dateString: string): Date {
  return new Date(`${dateString}T00:00:00+07:00`);
}
