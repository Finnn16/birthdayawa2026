"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardStatCard } from "../_components/DashboardStatCard";

type AnalyticsData = {
  moodMetrics: {
    weeklyAverage: number;
    trend: number;
    highestDay: string;
    lowestDay: string;
  };
  activityMetrics: {
    currentStreak: number;
    longestStreak: number;
    mostActiveHour: string;
    totalXpEarned: number;
  };
  engagementScore: {
    overall: number;
    moodConsistency: number;
    questCompletion: number;
    dailyActivity: number;
  };
  moodHistory: Array<{
    date: string;
    rating: number;
    note?: string;
  }>;
};

export function EngagementAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("week");

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/analytics?range=${timeRange}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-semibold">Error loading analytics</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-2">Track emotional engagement metrics</p>
        </div>
        <div className="flex gap-2">
          {(["week", "month", "year"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                timeRange === range
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Mood Metrics */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Mood Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardStatCard
            title="Weekly Average"
            value={data.moodMetrics.weeklyAverage.toFixed(1)}
            icon="😊"
            trend={{
              value: Math.abs(data.moodMetrics.trend),
              isPositive: data.moodMetrics.trend >= 0,
            }}
            subtitle="out of 10"
          />
          <DashboardStatCard
            title="Highest Day"
            value={data.moodMetrics.highestDay}
            icon="🌟"
            subtitle="Best rating"
          />
          <DashboardStatCard
            title="Lowest Day"
            value={data.moodMetrics.lowestDay}
            icon="📉"
            subtitle="Needs support"
          />
          <DashboardStatCard
            title="Consistency"
            value={Math.round(data.engagementScore.moodConsistency)}
            icon="✅"
            subtitle="%"
          />
        </div>
      </section>

      {/* Activity Metrics */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Activity Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardStatCard
            title="Current Streak"
            value={data.activityMetrics.currentStreak}
            icon="🔥"
            subtitle="days"
          />
          <DashboardStatCard
            title="Longest Streak"
            value={data.activityMetrics.longestStreak}
            icon="🏆"
            subtitle="record"
          />
          <DashboardStatCard
            title="Most Active"
            value={data.activityMetrics.mostActiveHour}
            icon="⏰"
            subtitle="hour"
          />
          <DashboardStatCard
            title="Total XP"
            value={data.activityMetrics.totalXpEarned}
            icon="⭐"
            subtitle="points"
          />
        </div>
      </section>

      {/* Engagement Score */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Engagement Score</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className="text-6xl font-bold text-purple-600 mb-2">
              {data.engagementScore.overall}
            </div>
            <p className="text-gray-600 text-lg">Overall Engagement</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "Mood Consistency", value: data.engagementScore.moodConsistency },
              { label: "Quest Completion", value: data.engagementScore.questCompletion },
              { label: "Daily Activity", value: data.engagementScore.dailyActivity },
            ].map((metric, idx) => (
              <div key={idx} className="text-center">
                <p className="text-gray-600 font-semibold mb-2">{metric.label}</p>
                <div className="relative w-24 h-24 mx-auto">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="8"
                      strokeDasharray={`${metric.value * 2.83} 283`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-900">
                      {Math.round(metric.value)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Mood History */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Mood History</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Rating
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Note
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.moodHistory.map((entry, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                    {entry.date}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-lg">{entry.rating}/10</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {entry.note || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
