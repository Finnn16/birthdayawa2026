"use client";

import { useCallback, useEffect, useState } from "react";

type MemoryEntry = {
  id: string;
  type: "letter" | "event" | "milestone" | "mood" | "memory";
  title: string;
  description?: string;
  date: string;
  icon: string;
  color: string;
  relatedData?: any;
};

export function MemoryVault() {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "letter" | "event" | "milestone">("all");

  const fetchMemories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/memory-vault");
      if (!res.ok) throw new Error("Failed to fetch memories");
      const json = await res.json();
      setMemories(json.memories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const filteredMemories =
    filter === "all" ? memories : memories.filter((m) => m.type === filter);

  const filterOptions: Array<{ id: typeof filter; label: string; icon: string }> = [
    { id: "all", label: "All Memories", icon: "💾" },
    { id: "letter", label: "Letters", icon: "✉️" },
    { id: "event", label: "Events", icon: "🎉" },
    { id: "milestone", label: "Milestones", icon: "🏆" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Memory Vault</h1>
        <p className="text-gray-600 mt-2">
          Your relationship timeline and special moments
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setFilter(option.id)}
            className={`px-4 py-2 rounded-full font-semibold transition-all ${
              filter === option.id
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading memories...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-semibold">Error loading memories</p>
          <p className="text-sm">{error}</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-200 to-pink-200" />

          {/* Timeline entries */}
          <div className="space-y-6 pl-20">
            {filteredMemories.length > 0 ? (
              filteredMemories.map((memory, idx) => (
                <div key={memory.id} className="relative">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-16 top-2 w-5 h-5 rounded-full border-4 border-white ${memory.color}`}
                  />

                  {/* Memory card */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{memory.icon}</span>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">
                            {memory.title}
                          </h3>
                          <p className="text-sm text-gray-500">{memory.date}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold capitalize">
                        {memory.type}
                      </span>
                    </div>

                    {memory.description && (
                      <p className="text-gray-600 mb-3">{memory.description}</p>
                    )}

                    {memory.relatedData && (
                      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                        {JSON.stringify(memory.relatedData, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-gray-600">No memories found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <section className="border-t pt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Memory Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total Memories",
              value: memories.length,
              icon: "💾",
            },
            {
              label: "Letters",
              value: memories.filter((m) => m.type === "letter").length,
              icon: "✉️",
            },
            {
              label: "Events",
              value: memories.filter((m) => m.type === "event").length,
              icon: "🎉",
            },
            {
              label: "Milestones",
              value: memories.filter((m) => m.type === "milestone").length,
              icon: "🏆",
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg border border-gray-200 p-4 text-center"
            >
              <p className="text-3xl mb-2">{stat.icon}</p>
              <p className="text-gray-600 text-sm font-semibold">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
