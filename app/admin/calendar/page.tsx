"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CalendarType = "quest" | "message" | "minigame" | "event";
type CalendarView = "month" | "week" | "day";

type CalendarItem = {
  id: string;
  contentId: string;
  type: CalendarType;
  title: string;
  date: string;
  status: string;
  category?: string | null;
  description?: string | null;
  endpoint?: string;
};

const TYPE_OPTIONS: Array<{ id: CalendarType; label: string; color: string; dot: string }> = [
  { id: "quest", label: "Quest", color: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-500" },
  { id: "message", label: "Hero Message", color: "bg-rose-50 text-rose-700 border-rose-100", dot: "bg-rose-500" },
  { id: "minigame", label: "Mini Game", color: "bg-violet-50 text-violet-700 border-violet-100", dot: "bg-violet-500" },
  { id: "event", label: "Event", color: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  return addDays(date, -date.getDay());
}

function startOfMonthGrid(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  return startOfWeek(first);
}

function buildDays(anchor: Date, view: CalendarView) {
  if (view === "day") return [new Date(anchor)];
  const start = view === "week" ? startOfWeek(anchor) : startOfMonthGrid(anchor);
  const length = view === "week" ? 7 : 42;
  return Array.from({ length }, (_, index) => addDays(start, index));
}

function formatHeading(date: Date, view: CalendarView) {
  if (view === "day") {
    return date.toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  }
  if (view === "week") {
    const start = startOfWeek(date);
    const end = addDays(start, 6);
    return `${start.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} - ${end.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}`;
  }
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function getTypeMeta(type: CalendarType) {
  return TYPE_OPTIONS.find((option) => option.id === type) ?? TYPE_OPTIONS[0];
}

function getStatusClass(status: string) {
  if (status === "published") return "bg-green-100 text-green-700";
  if (status === "scheduled") return "bg-amber-100 text-amber-700";
  if (status === "archived") return "bg-slate-100 text-slate-700";
  return "bg-gray-100 text-gray-700";
}

export default function ContentCalendarPage() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [activeDate, setActiveDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [enabledTypes, setEnabledTypes] = useState<Record<CalendarType, boolean>>({
    quest: true,
    message: true,
    minigame: true,
    event: true,
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchCalendar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/content-calendar");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load content calendar");
      setItems(json.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const visibleDays = useMemo(() => buildDays(activeDate, view), [activeDate, view]);
  const filteredItems = useMemo(
    () => items.filter((item) => enabledTypes[item.type]),
    [items, enabledTypes],
  );
  const itemsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarItem[]>();
    for (const item of filteredItems) {
      const list = grouped.get(item.date) ?? [];
      list.push(item);
      grouped.set(item.date, list);
    }
    return grouped;
  }, [filteredItems]);

  const totals = useMemo(() => {
    return TYPE_OPTIONS.map((option) => ({
      ...option,
      count: items.filter((item) => item.type === option.id).length,
    }));
  }, [items]);

  const selectedDateItems = selectedDate ? itemsByDate.get(selectedDate) ?? [] : [];
  const selectedDateLabel = selectedDate
    ? parseDateKey(selectedDate).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
    : "";

  const moveDate = (direction: -1 | 1) => {
    const next = new Date(activeDate);
    if (view === "month") next.setMonth(next.getMonth() + direction);
    if (view === "week") next.setDate(next.getDate() + direction * 7);
    if (view === "day") next.setDate(next.getDate() + direction);
    setActiveDate(next);
  };

  const rescheduleItem = async (item: CalendarItem, date: string) => {
    try {
      setBusy(true);
      setError(null);
      setNotice(null);
      const res = await fetch("/api/admin/content-calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, type: item.type, date }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to reschedule item");
      setNotice(`${item.title} moved to ${date}.`);
      setItems((current) => current.map((entry) => (entry.id === item.id && entry.type === item.type ? { ...entry, date } : entry)));
      setSelectedDate(date);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  const handleDrop = (date: string, raw: string) => {
    const [type, id] = raw.split(":") as [CalendarType, string];
    const item = items.find((entry) => entry.type === type && entry.id === id);
    if (item && item.date !== date) {
      rescheduleItem(item, date);
    }
  };

  const toggleType = (type: CalendarType) => {
    setEnabledTypes((current) => ({ ...current, [type]: !current[type] }));
  };

  const openDate = (date: Date) => {
    setSelectedDate(toDateKey(date));
  };

  const dayCellClass = (date: Date) => {
    const isCurrentMonth = date.getMonth() === activeDate.getMonth();
    const isToday = toDateKey(date) === toDateKey(new Date());
    return [
      "min-h-[218px] cursor-pointer border border-gray-200 bg-white p-4 text-left transition-colors hover:bg-purple-50/50 focus:outline-none focus:ring-2 focus:ring-purple-400",
      isCurrentMonth || view !== "month" ? "text-gray-900" : "bg-gray-50 text-gray-400",
      isToday ? "ring-2 ring-purple-400 ring-inset" : "",
    ].join(" ");
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Content Calendar</h1>
          <p className="mt-2 text-gray-600">Plan and reschedule all admin content from one calendar.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => moveDate(-1)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Prev</button>
          <button onClick={() => setActiveDate(new Date())} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Today</button>
          <button onClick={() => moveDate(1)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Next</button>
          <div className="ml-0 flex overflow-hidden rounded-lg border border-gray-300 bg-white lg:ml-3">
            {(["month", "week", "day"] as CalendarView[]).map((option) => (
              <button
                key={option}
                onClick={() => setView(option)}
                className={`px-4 py-2 text-sm font-semibold capitalize ${view === option ? "bg-purple-600 text-white" : "text-gray-700 hover:bg-gray-50"}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {notice && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">{notice}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <section className="min-w-0">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-3xl font-bold text-gray-900">{formatHeading(activeDate, view)}</h2>
          <p className="text-sm font-semibold text-gray-500">{loading ? "Loading..." : `${filteredItems.length} visible items`}</p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className={view === "day" ? "min-w-[420px]" : "min-w-[1120px]"}>
            {view !== "day" && (
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-100">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">{day}</div>
                ))}
              </div>
            )}

            <div className={`grid ${view === "day" ? "grid-cols-1" : "grid-cols-7"}`}>
              {visibleDays.map((day) => {
                const dateKey = toDateKey(day);
                const dayItems = itemsByDate.get(dateKey) ?? [];
                const previewItems = dayItems.slice(0, 5);
                const hiddenCount = dayItems.length - previewItems.length;

                return (
                  <div
                    key={dateKey}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDate(day)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDate(day);
                      }
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(dateKey, event.dataTransfer.getData("text/plain"))}
                    className={dayCellClass(day)}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold leading-none">{day.getDate()}</p>
                        {view === "day" && (
                          <p className="mt-1 text-sm font-semibold text-gray-500">
                            {day.toLocaleDateString("id-ID", { weekday: "long", month: "long", year: "numeric" })}
                          </p>
                        )}
                      </div>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-500">{dayItems.length}</span>
                    </div>

                    <div className="space-y-2">
                      {previewItems.map((item) => {
                        const meta = getTypeMeta(item.type);
                        return (
                          <div
                            key={`${item.type}-${item.id}`}
                            draggable={!busy}
                            onDragStart={(event) => event.dataTransfer.setData("text/plain", `${item.type}:${item.id}`)}
                            className={`rounded-md border px-3 py-2 text-xs shadow-sm transition hover:shadow ${meta.color}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-bold">{item.title}</span>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusClass(item.status)}`}>{item.status}</span>
                            </div>
                            <p className="mt-1 truncate text-[11px] font-semibold opacity-80">{meta.label}{item.category ? ` / ${item.category}` : ""}</p>
                          </div>
                        );
                      })}
                      {hiddenCount > 0 && (
                        <div className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs font-bold text-gray-500">
                          +{hiddenCount} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setFiltersOpen((current) => !current)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg shadow-purple-900/25 transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
        aria-label="Open calendar filters"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M7 12h10" />
          <path d="M10 18h4" />
        </svg>
      </button>

      {filtersOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-[min(320px,calc(100vw-3rem))] rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-bold uppercase tracking-wide text-gray-500">Filters</p>
            <button type="button" onClick={() => setFiltersOpen(false)} className="rounded-md px-2 py-1 text-sm font-bold text-gray-500 hover:bg-gray-100">Close</button>
          </div>
          <div className="space-y-3">
            {totals.map((option) => (
              <label key={option.id} className="flex cursor-pointer items-center justify-between gap-3 text-sm text-gray-700">
                <span className="flex min-w-0 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enabledTypes[option.id]}
                    onChange={() => toggleType(option.id)}
                    className="h-4 w-4 rounded border-gray-300 text-purple-600"
                  />
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${option.dot}`} />
                  <span className="truncate">{option.label}</span>
                </span>
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{option.count}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-gray-500">Date Details</p>
                <h3 className="mt-1 text-2xl font-bold text-gray-900">{selectedDateLabel}</h3>
                <p className="mt-1 text-sm font-semibold text-gray-500">{selectedDateItems.length} visible items</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="max-h-[62vh] overflow-y-auto p-5">
              {selectedDateItems.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateItems.map((item) => {
                    const meta = getTypeMeta(item.type);
                    return (
                      <article key={`${item.type}-${item.id}`} className="rounded-lg border border-gray-200 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h4 className="text-lg font-bold text-gray-900">{item.title}</h4>
                            {item.description && <p className="mt-2 text-sm leading-6 text-gray-600">{item.description}</p>}
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${meta.color}`}>{meta.label}</span>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${getStatusClass(item.status)}`}>{item.status}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-gray-500">
                          {item.category && <span className="rounded-md bg-gray-100 px-2 py-1">{item.category}</span>}
                          <span className="rounded-md bg-gray-100 px-2 py-1">{item.contentId}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm font-semibold text-gray-500">
                  No visible content on this date.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
