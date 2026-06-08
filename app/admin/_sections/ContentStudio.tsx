"use client";

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "../_components/ContentCard";

type ContentStudioTab = "minigames" | "quests" | "rewards" | "messages";
type PublishStatus = "draft" | "scheduled" | "published" | "archived";
type TemplateContentType = "quest" | "message" | "minigame";
type TemplateCategory = "all" | "reflection" | "gratitude" | "romantic" | "memory" | "challenge" | "motivation";

type ContentTemplate = {
  id: string;
  category: Exclude<TemplateCategory, "all">;
  contentType: TemplateContentType;
  title: string;
  summary: string;
};

type ContentItem = {
  id: string;
  title: string;
  type?: string;
  activeDate?: string;
  active_date?: string;
  trigger_date?: string;
  is_active: boolean;
  publish_status?: PublishStatus;
  publish_at?: string | null;
  published_at?: string | null;
  archived_at?: string | null;
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
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scheduleItemId, setScheduleItemId] = useState<string | null>(null);
  const [scheduleStatus, setScheduleStatus] = useState<PublishStatus>("draft");
  const [scheduleAt, setScheduleAt] = useState("");
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory>("all");

  const tabs: Array<{ id: ContentStudioTab; label: string; icon: string }> = [
    { id: "minigames", label: "Mini-Games", icon: "🎮" },
    { id: "quests", label: "Quests", icon: "📝" },
    { id: "rewards", label: "Rewards", icon: "🎁" },
    { id: "messages", label: "Messages", icon: "💌" },
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
      };

      const res = await fetch(endpoints[activeTab]);
      if (!res.ok) throw new Error(`Failed to fetch ${activeTab}`);

      const json = await res.json();
      const responseKeys: Record<ContentStudioTab, string> = {
        minigames: "minigames",
        quests: "quests",
        rewards: "rewards",
        messages: "heroMessages",
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

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("/api/admin/content-templates");
        const json = await res.json();
        if (res.ok) setTemplates(json.templates ?? []);
      } catch {
        setTemplates([]);
      }
    };

    fetchTemplates();
  }, []);

  const getContentTypeLabel = (item: ContentItem) => {
    if (activeTab === "minigames") return item.type;
    if (activeTab === "quests") return item.type;
    if (activeTab === "rewards") return "Reward";
    if (activeTab === "messages") return item.type;
    return undefined;
  };

  const getPatchEndpoint = (id: string) => {
    const endpoints: Record<ContentStudioTab, string> = {
      minigames: `/api/admin/minigames/${id}`,
      quests: `/api/admin/daily-quest-bank/${id}`,
      rewards: `/api/admin/rewards/${id}`,
      messages: `/api/admin/hero-messages/${id}`,
    };
    return endpoints[activeTab];
  };

  const getTemplateContentType = (): TemplateContentType | null => {
    if (activeTab === "quests") return "quest";
    if (activeTab === "messages") return "message";
    if (activeTab === "minigames") return "minigame";
    return null;
  };

  const templateCategories: TemplateCategory[] = [
    "all",
    "reflection",
    "gratitude",
    "romantic",
    "memory",
    "challenge",
    "motivation",
  ];

  const visibleTemplates = templates.filter((template) => {
    const contentType = getTemplateContentType();
    if (!contentType || template.contentType !== contentType) return false;
    if (templateCategory === "all") return true;
    return template.category === templateCategory;
  });

  const getPublishStatus = (item: ContentItem): PublishStatus => {
    if (item.publish_status) return item.publish_status;
    return item.is_active ? "published" : "draft";
  };

  const toDateTimeInputValue = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  };

  const openSchedule = (item: ContentItem) => {
    setNotice(null);
    setScheduleItemId((current) => (current === item.id ? null : item.id));
    setScheduleStatus(getPublishStatus(item));
    setScheduleAt(toDateTimeInputValue(item.publish_at ?? item.active_date ?? item.trigger_date));
  };

  const handleDuplicate = async (id: string) => {
    try {
      setBusyId(id);
      setNotice(null);
      const res = await fetch(`/api/admin/content/${activeTab}/${id}/duplicate`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to duplicate content");
      setNotice("Content duplicated as draft.");
      await fetchContent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  const handleScheduleSave = async (id: string) => {
    try {
      setBusyId(id);
      setNotice(null);
      setError(null);

      if (scheduleStatus === "scheduled" && !scheduleAt) {
        throw new Error("Publish date and time wajib diisi untuk status Scheduled.");
      }

      const payload = {
        publish_status: scheduleStatus,
        publish_at: scheduleStatus === "scheduled" ? new Date(scheduleAt).toISOString() : null,
      };

      const res = await fetch(getPatchEndpoint(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to update publish status");

      setNotice("Publish status updated.");
      setScheduleItemId(null);
      await fetchContent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      setBusyId(templateId);
      setNotice(null);
      setError(null);
      const res = await fetch("/api/admin/content-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: templateId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to create draft from template");
      setNotice("Draft created from template.");
      setShowTemplates(false);
      if (
        (json.studioTab === "quests" && activeTab !== "quests") ||
        (json.studioTab === "messages" && activeTab !== "messages") ||
        (json.studioTab === "minigames" && activeTab !== "minigames")
      ) {
        setActiveTab(json.studioTab);
      } else {
        await fetchContent();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  const handleEdit = (id: string) => {
    // TODO: implement edit modal
    console.log("Edit:", id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      setBusyId(id);
      setNotice(null);
      setError(null);
      const res = await fetch(getPatchEndpoint(id), { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to delete content");
      setNotice("Content deleted.");
      await fetchContent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = () => {
    setShowTemplates((current) => !current);
    setTemplateCategory("all");
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

      {notice && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm font-semibold">
          {notice}
        </div>
      )}

      {showTemplates && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Template Library</h2>
              <p className="mt-1 text-sm text-gray-500">Choose a template to create a draft, then schedule it from the content card.</p>
            </div>
            <button
              onClick={() => setShowTemplates(false)}
              className="self-start rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 md:self-auto"
            >
              Close
            </button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {templateCategories.map((category) => (
              <button
                key={category}
                onClick={() => setTemplateCategory(category)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize ${
                  templateCategory === category
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {getTemplateContentType() ? (
            visibleTemplates.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visibleTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleCreateFromTemplate(template.id)}
                    disabled={busyId === template.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-left transition hover:border-purple-300 hover:bg-purple-50 disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-gray-900">{template.title}</p>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold capitalize text-purple-700">
                        {template.category}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-gray-600">{template.summary}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                No templates match this category.
              </div>
            )
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              Templates are available for Quests, Hero Messages, and Mini-Games.
            </div>
          )}
        </div>
      )}

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
                  publishAt={item.publish_at ?? undefined}
                  reward={{
                    xp: item.xpReward ?? item.xp_reward,
                    hearts: item.heartsReward ?? item.hearts_reward ?? item.cost_hearts,
                  }}
                  status={getPublishStatus(item)}
                  lastUpdated={item.updated_at ? new Date(item.updated_at).toLocaleDateString() : undefined}
                  isBusy={busyId === item.id}
                  onSchedule={() => openSchedule(item)}
                  onDuplicate={() => handleDuplicate(item.id)}
                  onEdit={() => handleEdit(item.id)}
                  onDelete={() => handleDelete(item.id)}
                >
                  {scheduleItemId === item.id && (
                    <div className="mt-4 rounded-lg border border-purple-100 bg-purple-50 p-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
                        <label className="text-sm font-semibold text-gray-700">
                          Status
                          <select
                            value={scheduleStatus}
                            onChange={(event) => setScheduleStatus(event.target.value as PublishStatus)}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                          >
                            <option value="draft">Draft</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="published">Published</option>
                            <option value="archived">Archived</option>
                          </select>
                        </label>
                        <label className="text-sm font-semibold text-gray-700">
                          Publish Date & Time
                          <input
                            type="datetime-local"
                            value={scheduleAt}
                            onChange={(event) => setScheduleAt(event.target.value)}
                            disabled={scheduleStatus !== "scheduled"}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100"
                          />
                        </label>
                        <button
                          onClick={() => handleScheduleSave(item.id)}
                          disabled={busyId === item.id}
                          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </ContentCard>
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
