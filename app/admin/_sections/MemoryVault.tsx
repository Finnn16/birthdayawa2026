"use client";

import { useCallback, useEffect, useState } from "react";

type MemoryEntry = {
  id: string;
  type: "event" | "milestone" | "mood" | "memory";
  title: string;
  description?: string;
  date: string;
  icon: string;
  color: string;
  relatedData?: Record<string, unknown>;
};

type MemoryFilter = "all" | "event" | "milestone";

function getMemoryIcon(type: MemoryEntry["type"]) {
  if (type === "event") return "EV";
  if (type === "milestone") return "MS";
  if (type === "mood") return "MD";
  return "RW";
}

export function MemoryVault() {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MemoryFilter>("all");

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
    filter === "all" ? memories : memories.filter((memory) => memory.type === filter);

  const filterOptions: Array<{ id: MemoryFilter; label: string; icon: string }> = [
    { id: "all", label: "All Memories", icon: "All" },
    { id: "event", label: "Events", icon: "Event" },
    { id: "milestone", label: "Milestones", icon: "Milestone" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Memory Vault</h1>
        <p className="text-gray-600 mt-2">
          Your relationship timeline and special moments
        </p>
      </div>

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
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          {filteredMemories.length > 0 ? (
            <div className="overflow-x-auto pb-3">
              <div className="relative flex min-w-max gap-4 px-2 pt-7">
                <div className="absolute left-2 right-2 top-10 h-1 rounded-full bg-gradient-to-r from-purple-200 via-pink-200 to-blue-200" />

                {filteredMemories.map((memory) => (
                  <article key={memory.id} className="relative w-64 shrink-0 pt-8">
                    <div
                      className={`absolute left-4 top-0 z-10 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white text-[10px] font-bold text-white shadow-sm ${memory.color}`}
                      title={memory.icon}
                    >
                      {getMemoryIcon(memory.type)}
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-gray-500">{memory.date}</p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold capitalize text-gray-700">
                          {memory.type}
                        </span>
                      </div>
                      <h3 className="line-clamp-2 text-base font-bold leading-snug text-gray-900">
                        {memory.title}
                      </h3>
                      {memory.description && (
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">
                          {memory.description}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">No memories found</p>
            </div>
          )}
        </div>
      )}

      <section className="border-t pt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Memory Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            {
              label: "Total Memories",
              value: memories.length,
              icon: "All",
            },
            {
              label: "Events",
              value: memories.filter((memory) => memory.type === "event").length,
              icon: "Event",
            },
            {
              label: "Milestones",
              value: memories.filter((memory) => memory.type === "milestone").length,
              icon: "Milestone",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-lg border border-gray-200 p-4 text-center"
            >
              <p className="text-sm font-bold text-gray-500 mb-2">{stat.icon}</p>
              <p className="text-gray-600 text-sm font-semibold">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
