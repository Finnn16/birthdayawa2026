"use client";

import { useCallback, useEffect, useState } from "react";

type AiHeroMessage = {
  id: string;
  title?: string | null;
  summary?: string | null;
  message: string;
  tone: string;
  generation_source: "ai" | "fallback" | "manual";
  active_date: string;
  requires_review: boolean;
  created_at?: string | null;
  users?: { username?: string | null; email?: string | null } | null;
  moods?: { date?: string | null; rating?: number | null; note?: string | null } | null;
};

type Stats = {
  total: number;
  aiCount: number;
  fallbackCount: number;
  requiresReviewCount: number;
  aiSuccessRate: number;
};

export default function AiHeroMessagesPage() {
  const [messages, setMessages] = useState<AiHeroMessage[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    aiCount: 0,
    fallbackCount: 0,
    requiresReviewCount: 0,
    aiSuccessRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/ai-hero-messages");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to fetch AI hero messages");
      setMessages(json.messages ?? []);
      setStats(json.stats ?? {
        total: 0,
        aiCount: 0,
        fallbackCount: 0,
        requiresReviewCount: 0,
        aiSuccessRate: 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const generateToday = async (force = false) => {
    try {
      setBusy(true);
      setNotice(null);
      setError(null);
      const res = await fetch("/api/admin/ai-hero-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to generate AI hero messages");
      setNotice(`Processed ${json.processed ?? 0}. Created ${json.created ?? 0}, refreshed ${json.refreshed ?? 0}, skipped ${json.skipped ?? 0}.`);
      await fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">AI Hero Messages</h1>
          <p className="mt-2 text-gray-600">Generated daily hero copy from yesterday mood entries.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => generateToday(false)}
            disabled={busy}
            className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {busy ? "Generating..." : "Generate Missing"}
          </button>
          <button
            onClick={() => generateToday(true)}
            disabled={busy}
            className="rounded-lg bg-purple-600 px-5 py-3 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {busy ? "Refreshing..." : "Regenerate Today"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        {[
          ["Total", stats.total],
          ["AI", stats.aiCount],
          ["Fallback", stats.fallbackCount],
          ["Review", stats.requiresReviewCount],
          ["AI Rate", `${stats.aiSuccessRate}%`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {notice && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">{notice}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      {loading ? (
        <div className="flex h-64 items-center justify-center text-gray-500">Loading generated messages...</div>
      ) : messages.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {messages.map((item) => (
            <article key={item.id} className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-900">{item.title || "Untuk hari ini"}</h2>
                  <p className="mt-1 text-sm font-semibold text-gray-500">
                    {item.users?.username ?? item.users?.email ?? "Unknown user"} / active {item.active_date}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.generation_source === "ai" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {item.generation_source}
                  </span>
                  {item.requires_review && (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">review</span>
                  )}
                </div>
              </div>

              {item.summary && <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm font-semibold text-gray-600">{item.summary}</p>}
              <p className="mt-4 text-sm leading-6 text-gray-700">{item.message}</p>

              <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600 md:grid-cols-3">
                <div>
                  <p className="font-bold text-gray-500">Tone</p>
                  <p>{item.tone}</p>
                </div>
                <div>
                  <p className="font-bold text-gray-500">Mood</p>
                  <p>{item.moods?.rating ? `${item.moods.rating}/10` : "Unknown"}</p>
                </div>
                <div>
                  <p className="font-bold text-gray-500">Mood Date</p>
                  <p>{item.moods?.date ?? "-"}</p>
                </div>
              </div>

              {item.moods?.note && (
                <div className="mt-3 rounded-lg border border-gray-100 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Source Note</p>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{item.moods.note}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          No AI hero messages generated yet.
        </div>
      )}
    </div>
  );
}
