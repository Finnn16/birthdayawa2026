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

export function DashboardOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/dashboard-overview");
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          <button className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-lg transition-shadow text-center">
            <div className="text-2xl mb-2">✉️</div>
            <p className="text-sm font-semibold text-gray-900">New Letter</p>
          </button>
        </div>
      </section>
    </div>
  );
}
