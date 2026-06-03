"use client";

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "../_components/ContentCard";

type ContentStudioTab = "minigames" | "quests" | "rewards" | "messages" | "letters";

type ContentItem = {
  id: string;
  title: string;
  type?: string;
  activeDate?: string;
  active_date?: string;
  trigger_date?: string;
  is_active: boolean;
  xpReward?: number;
  xp_reward?: number;
  heartsReward?: number;
  hearts_reward?: number;
  cost_hearts?: number;
  updated_at?: string;
};

export function ContentStudio() {
  const [activeTab, setActiveTab] = useState<ContentStudioTab>("minigames");
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabs: Array<{ id: ContentStudioTab; label: string; icon: string }> = [
    { id: "minigames", label: "Mini-Games", icon: "🎮" },
    { id: "quests", label: "Quests", icon: "📝" },
    { id: "rewards", label: "Rewards", icon: "🎁" },
    { id: "messages", label: "Messages", icon: "💌" },
    { id: "letters", label: "Letters", icon: "✉️" },
  ];

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoints: Record<ContentStudioTab, string> = {
        minigames: "/api/admin/minigames",
        quests: "/api/admin/daily-quest-bank",
        rewards: "/api/admin/rewards",
        messages: "/api/admin/hero-messages",
        letters: "/api/admin/letters",
      };

      const res = await fetch(endpoints[activeTab]);
      if (!res.ok) throw new Error(`Failed to fetch ${activeTab}`);

      const json = await res.json();
      const responseKeys: Record<ContentStudioTab, string> = {
        minigames: "minigames",
        quests: "quests",
        rewards: "rewards",
        messages: "heroMessages",
        letters: "letters",
      };
      setContent(json.data || json[activeTab] || json[responseKeys[activeTab]] || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const getContentTypeLabel = (item: ContentItem) => {
    if (activeTab === "minigames") return item.type;
    if (activeTab === "quests") return item.type;
    if (activeTab === "rewards") return "Reward";
    if (activeTab === "messages") return item.type;
    return "Letter";
  };

  const handleEdit = (id: string) => {
    // TODO: implement edit modal
    console.log("Edit:", id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    // TODO: implement delete API call
    console.log("Delete:", id);
  };

  const handleCreate = () => {
    // TODO: implement create modal
    console.log("Create new:", activeTab);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Content Studio</h1>
          <p className="text-gray-600 mt-2">
            Create and manage all engagement content in one place
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-colors"
        >
          + Create New
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 font-semibold border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading content...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-semibold">Error loading content</p>
          <p className="text-sm">{error}</p>
        </div>
      ) : (
        <div>
          {content.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {content.map((item) => (
                <ContentCard
                  key={item.id}
                  title={item.title}
                  type={getContentTypeLabel(item)}
                  activeDate={item.activeDate ?? item.active_date ?? item.trigger_date}
                  reward={{
                    xp: item.xpReward ?? item.xp_reward,
                    hearts: item.heartsReward ?? item.hearts_reward ?? item.cost_hearts,
                  }}
                  status={item.is_active ? "active" : "inactive"}
                  lastUpdated={item.updated_at ? new Date(item.updated_at).toLocaleDateString() : undefined}
                  onEdit={() => handleEdit(item.id)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-gray-600">No {activeTab} yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Create your first one to get started!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
