"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardStatCard } from "../_components/DashboardStatCard";

type DashboardData = {
  todayMoodStats: {
    submissionCount: number;
    averageRating: number;
    submittedUsers: string[];
    pendingUsers: string[];
  };
  activeContent: {
    questsActive: number;
    minigamesActive: number;
    messagesActive: number;
  };
  engagementMetrics: {
    currentStreak: number;
    totalXpEarned: number;
    heartsBalance: number;
  };
  upcomingEvents: Array<{
    title: string;
    date: string;
    daysUntil: number;
  }>;
  pendingActions: {
    pendingRedemptions: number;
    pendingStreakRequests: number;
  };
};

type RotationItem = {
  id: string;
  title: string;
  category?: string | null;
  difficulty?: string | null;
  score: number;
  reasons: string[];
};

type RotationData = {
  quests: RotationItem[];
  minigames: RotationItem[];
};

type SmartSuggestion = {
  id: string;
  scenario: string;
  priority: "high" | "medium" | "low";
  reason: string;
  recommendations: string[];
  actions: Array<{
    label: string;
    href?: string;
  }>;
};

export function DashboardOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [rotation, setRotation] = useState<RotationData | null>(null);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashboardRes, rotationRes, suggestionsRes] = await Promise.all([
        fetch("/api/admin/dashboard-overview"),
        fetch("/api/admin/rotation"),
        fetch("/api/admin/smart-suggestions"),
      ]);
      if (!dashboardRes.ok) throw new Error("Failed to fetch dashboard data");
      const dashboardJson = await dashboardRes.json();
      const rotationJson = rotationRes.ok ? await rotationRes.json() : null;
      const suggestionsJson = suggestionsRes.ok ? await suggestionsRes.json() : null;
      setData(dashboardJson.data);
      setRotation(rotationJson ? { quests: rotationJson.quests ?? [], minigames: rotationJson.minigames ?? [] } : null);
      setSuggestions(suggestionsJson?.suggestions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const autoPickQuest = async () => {
    try {
      setActionLoading(true);
      setActionNotice(null);
      const res = await fetch("/api/admin/daily-quest-assignments/auto-pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 1 }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to auto-pick quest");
      setActionNotice("Auto rotation assigned today's quest.");
      await fetchDashboardData();
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : "Auto-pick failed.");
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-semibold">Error loading dashboard</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const { todayMoodStats, activeContent, engagementMetrics, upcomingEvents, pendingActions } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      {/* Today Mood Summary */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Today's Mood</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DashboardStatCard
            title="Submissions"
            value={todayMoodStats.submissionCount}
            icon="📊"
            subtitle="mood entries today"
          />
          <DashboardStatCard
            title="Average Rating"
            value={todayMoodStats.averageRating.toFixed(1)}
            icon="😊"
            subtitle="out of 10"
          />
          <DashboardStatCard
            title="Pending"
            value={todayMoodStats.pendingUsers.length}
            icon="⏳"
            subtitle={todayMoodStats.pendingUsers.join(", ") || "all submitted"}
          />
        </div>
      </section>

      {actionNotice && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm font-semibold text-purple-800">
          {actionNotice}
        </div>
      )}

      {/* Smart Suggestions */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Smart Suggestions</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-gray-900">{suggestion.scenario}</p>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    suggestion.priority === "high"
                      ? "bg-red-100 text-red-700"
                      : suggestion.priority === "medium"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                  }`}
                >
                  {suggestion.priority}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-600">{suggestion.reason}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {suggestion.recommendations.map((item) => (
                  <span key={item} className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {suggestion.actions.slice(0, 2).map((action) => (
                  <a
                    key={action.label}
                    href={action.href ?? "/admin/studio"}
                    className="block rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50"
                  >
                    {action.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Auto Rotation */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Auto Rotation Queue</h2>
            <p className="text-sm text-gray-500">Ranked by freshness, completion count, and variation rules.</p>
          </div>
          <button
            onClick={autoPickQuest}
            disabled={actionLoading}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
          >
            Auto-pick Quest
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <p className="mb-4 font-bold text-gray-900">Quest Candidates</p>
            <div className="space-y-3">
              {(rotation?.quests ?? []).slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 rounded-lg bg-gray-50 p-3">
                  <div>
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{[item.category, item.difficulty].filter(Boolean).join(" · ")}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.reasons.slice(0, 2).join(", ")}</p>
                  </div>
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-bold text-purple-700">{item.score}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <p className="mb-4 font-bold text-gray-900">Mini-Game Candidates</p>
            <div className="space-y-3">
              {(rotation?.minigames ?? []).slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 rounded-lg bg-gray-50 p-3">
                  <div>
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{[item.category, item.difficulty].filter(Boolean).join(" · ")}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.reasons.slice(0, 2).join(", ")}</p>
                  </div>
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-bold text-purple-700">{item.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Active Content */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Active Content</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DashboardStatCard
            title="Quests Active"
            value={activeContent.questsActive}
            icon="📝"
          />
          <DashboardStatCard
            title="Mini-Games"
            value={activeContent.minigamesActive}
            icon="🎮"
          />
          <DashboardStatCard
            title="Messages"
            value={activeContent.messagesActive}
            icon="💌"
          />
        </div>
      </section>

      {/* Engagement Metrics */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Engagement Snapshot
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DashboardStatCard
            title="Current Streak"
            value={engagementMetrics.currentStreak}
            icon="🔥"
            subtitle="days"
          />
          <DashboardStatCard
            title="Total XP"
            value={engagementMetrics.totalXpEarned}
            icon="⭐"
            subtitle="points earned"
          />
          <DashboardStatCard
            title="Hearts Balance"
            value={engagementMetrics.heartsBalance}
            icon="❤️"
            subtitle="available"
          />
        </div>
      </section>

      {/* Upcoming Events */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Events</h2>
        {upcomingEvents.length > 0 ? (
          <div className="space-y-2">
            {upcomingEvents.map((event, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg border border-gray-200 p-4 flex justify-between items-center hover:shadow-md transition-shadow"
              >
                <div>
                  <p className="font-semibold text-gray-900">{event.title}</p>
                  <p className="text-sm text-gray-500">{event.date}</p>
                </div>
                <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-bold">
                  {event.daysUntil} days
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-6">No upcoming events</p>
        )}
      </section>

      {/* Pending Actions */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Pending Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 font-semibold">
              Pending Redemptions
            </p>
            <p className="text-3xl font-bold text-yellow-900 mt-2">
              {pendingActions.pendingRedemptions}
            </p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800 font-semibold">
              Streak Protection Requests
            </p>
            <p className="text-3xl font-bold text-orange-900 mt-2">
              {pendingActions.pendingStreakRequests}
            </p>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-lg transition-shadow text-center">
            <div className="text-2xl mb-2">📝</div>
            <p className="text-sm font-semibold text-gray-900">New Quest</p>
          </button>
          <button className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-lg transition-shadow text-center">
            <div className="text-2xl mb-2">🎮</div>
            <p className="text-sm font-semibold text-gray-900">New Game</p>
          </button>
          <button className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-lg transition-shadow text-center">
            <div className="text-2xl mb-2">💌</div>
            <p className="text-sm font-semibold text-gray-900">New Message</p>
          </button>
          {false && (
            <div className="text-2xl mb-2">✉️</div>
          )}
        </div>
      </section>
    </div>
  );
}
