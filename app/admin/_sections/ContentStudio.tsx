"use client";

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "../_components/ContentCard";

type ContentStudioTab = "minigames" | "quests" | "rewards" | "messages";
type PublishStatus = "draft" | "scheduled" | "published" | "archived";
type TemplateContentType = "quest" | "message" | "minigame";
type TemplateCategory = "all" | "reflection" | "gratitude" | "romantic" | "memory" | "challenge" | "motivation";

const MINI_GAME_TYPES = ["Love Quiz", "Daily Question", "This-or-That", "Memory Prompt", "Guess the Date", "Small Challenge"];
const MINI_GAME_DIFFICULTIES = ["Easy", "Medium", "Hard"];
const QUEST_TYPES = ["reflection", "multiple_choice", "checklist", "text_answer", "self_care"];
const QUEST_DIFFICULTIES = ["easy", "medium", "hard"];

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
  description?: string | null;
  type?: string;
  difficulty?: string;
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
  category?: string | null;
  stock_limit?: number | null;
  body?: string | null;
  tone?: string | null;
  prompt?: string | null;
  options_json?: unknown;
  correct_answer?: string | null;
  metadata_json?: unknown;
  updated_at?: string;
};

type EditForm = {
  title: string;
  description: string;
  type: string;
  difficulty: string;
  xp_reward: string;
  hearts_reward: string;
  cost_hearts: string;
  category: string;
  stock_limit: string;
  active_date: string;
  body: string;
  tone: string;
  prompt: string;
  options_json: string;
  correct_answer: string;
};

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function jsonListToText(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item)).join("\n");
  if (typeof value === "string") return value;
  return "";
}

function numberFromInput(value: string, fallback = 0) {
  if (!value.trim()) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

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
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

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
    setSelectedIds(new Set());
    setScheduleItemId(null);
    closeEdit();
  }, [activeTab]);

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

  const getResponseItem = (json: Record<string, unknown>): ContentItem | null => {
    const responseKeys: Record<ContentStudioTab, string> = {
      minigames: "minigame",
      quests: "quest",
      rewards: "reward",
      messages: "heroMessage",
    };
    const item = json[responseKeys[activeTab]];
    return item && typeof item === "object" ? (item as ContentItem) : null;
  };

  const updateContentItem = (item: ContentItem) => {
    setContent((current) => current.map((entry) => (entry.id === item.id ? item : entry)));
  };

  const addContentItem = (item: ContentItem) => {
    setContent((current) => [item, ...current]);
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

  const getInitialEditForm = (item: ContentItem): EditForm => ({
    title: item.title ?? "",
    description: item.description ?? "",
    type: item.type ?? (activeTab === "quests" ? QUEST_TYPES[0] : activeTab === "minigames" ? MINI_GAME_TYPES[0] : "experience"),
    difficulty: item.difficulty ?? (activeTab === "minigames" ? "Easy" : "easy"),
    xp_reward: String(item.xpReward ?? item.xp_reward ?? 0),
    hearts_reward: String(item.heartsReward ?? item.hearts_reward ?? 0),
    cost_hearts: String(item.cost_hearts ?? 0),
    category: item.category ?? "experience",
    stock_limit: item.stock_limit === null || item.stock_limit === undefined ? "" : String(item.stock_limit),
    active_date: toDateInputValue(item.activeDate ?? item.active_date ?? item.trigger_date),
    body: item.body ?? "",
    tone: item.tone ?? "soft",
    prompt: item.prompt ?? "",
    options_json: jsonListToText(item.options_json),
    correct_answer: item.correct_answer ?? "",
  });

  const closeEdit = () => {
    setEditingItem(null);
    setEditForm(null);
  };

  const handleDuplicate = async (id: string) => {
    try {
      setBusyId(id);
      setNotice(null);
      setError(null);
      const res = await fetch(`/api/admin/content/${activeTab}/${id}/duplicate`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to duplicate content");
      const duplicated = getResponseItem(json);
      if (duplicated) {
        addContentItem(duplicated);
      } else {
        await fetchContent();
      }
      setNotice("Content duplicated as draft.");
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
      const updated = getResponseItem(json);
      if (updated) {
        updateContentItem(updated);
      }

      setNotice("Publish status updated.");
      setScheduleItemId(null);
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
        const created = getResponseItem(json);
        if (created) {
          addContentItem(created);
        } else {
          await fetchContent();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  const handleEdit = (item: ContentItem) => {
    setNotice(null);
    setError(null);
    setEditingItem(item);
    setEditForm(getInitialEditForm(item));
  };

  const handleEditSave = async () => {
    if (!editingItem || !editForm) return;

    try {
      setBusyId(editingItem.id);
      setNotice(null);
      setError(null);

      const payload: Record<string, unknown> = {
        title: editForm.title,
      };

      if (activeTab === "messages") {
        payload.body = editForm.body;
        payload.tone = editForm.tone;
        payload.active_date = editForm.active_date || null;
      }

      if (activeTab === "rewards") {
        payload.description = editForm.description;
        payload.cost_hearts = numberFromInput(editForm.cost_hearts);
        payload.category = editForm.category || "experience";
        payload.stock_limit = editForm.stock_limit.trim() ? numberFromInput(editForm.stock_limit) : null;
      }

      if (activeTab === "quests" || activeTab === "minigames") {
        payload.description = editForm.description;
        payload.type = editForm.type;
        payload.difficulty = editForm.difficulty;
        payload.xp_reward = numberFromInput(editForm.xp_reward);
        payload.hearts_reward = numberFromInput(editForm.hearts_reward);
        payload.prompt = editForm.prompt;
        payload.options_json = editForm.options_json
          .split("\n")
          .map((option) => option.trim())
          .filter(Boolean);
        payload.correct_answer = editForm.correct_answer;
      }

      if (activeTab === "minigames") {
        payload.active_date = editForm.active_date || null;
      }

      const res = await fetch(getPatchEndpoint(editingItem.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to update content");
      const updated = getResponseItem(json);
      if (updated) {
        updateContentItem(updated);
      }

      setNotice("Content updated.");
      closeEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    const previousContent = content;
    try {
      setBusyId(id);
      setNotice(null);
      setError(null);
      setContent((current) => current.filter((item) => item.id !== id));
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      const res = await fetch(getPatchEndpoint(id), { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to delete content");
      setNotice("Content deleted.");
    } catch (err) {
      setContent(previousContent);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(content.map((item) => item.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} selected ${activeTab}?`)) return;

    const previousContent = content;
    const selectedIdSet = new Set(ids);

    try {
      setBulkDeleting(true);
      setNotice(null);
      setError(null);
      setContent((current) => current.filter((item) => !selectedIdSet.has(item.id)));
      setSelectedIds(new Set());

      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(getPatchEndpoint(id), { method: "DELETE" });
          const json = await res.json().catch(() => ({}));
          return {
            id,
            ok: res.ok,
            error: typeof json.error === "string" ? json.error : "Failed to delete content",
          };
        }),
      );

      const failed = results.filter((result) => !result.ok);
      if (failed.length) {
        const failedIds = new Set(failed.map((result) => result.id));
        setContent(previousContent.filter((item) => !selectedIdSet.has(item.id) || failedIds.has(item.id)));
        setError(`${failed.length} item gagal dihapus. ${failed[0]?.error ?? ""}`.trim());
      }

      const deletedCount = results.length - failed.length;
      if (deletedCount > 0) {
        setNotice(`${deletedCount} content deleted.`);
      }
    } catch (err) {
      setContent(previousContent);
      setSelectedIds(selectedIdSet);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleCreate = () => {
    setShowTemplates((current) => !current);
    setTemplateCategory("all");
  };

  const updateEditField = (field: keyof EditForm, value: string) => {
    setEditForm((current) => (current ? { ...current, [field]: value } : current));
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Content Studio</h1>
          <p className="text-gray-600 mt-2">
            Create and manage all engagement content in one place
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-colors sm:w-auto"
        >
          + Create New
        </button>
      </div>

      {notice && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm font-semibold">
          {notice}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          <p className="font-semibold">Action needs attention</p>
          <p>{error}</p>
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

      {content.length > 0 && (
        <div className="sticky top-0 z-20 rounded-lg border border-gray-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={selectedCount === content.length ? clearSelection : selectAllVisible}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {selectedCount === content.length ? "Clear all" : "Select all"}
              </button>
              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                >
                  Clear selected
                </button>
              )}
              <span className="text-sm font-semibold text-gray-500">
                {selectedCount > 0 ? `${selectedCount} selected` : `${content.length} ${activeTab}`}
              </span>
            </div>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={!selectedCount || bulkDeleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkDeleting ? "Deleting..." : `Delete Selected${selectedCount ? ` (${selectedCount})` : ""}`}
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading content...</p>
        </div>
      ) : (
        <div>
          {content.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {content.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <div key={item.id} className={`relative rounded-xl transition ${isSelected ? "ring-2 ring-purple-500 ring-offset-2" : ""}`}>
                    <label className="absolute left-3 top-3 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(item.id)}
                        disabled={bulkDeleting}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600"
                        aria-label={`Select ${item.title}`}
                      />
                    </label>
                    <ContentCard
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
                      onEdit={() => handleEdit(item)}
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
                  </div>
                );
              })}
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

      {editingItem && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeEdit}
        >
          <div
            className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-gray-500">Edit Content</p>
                <h2 className="mt-1 text-2xl font-bold text-gray-900">{editingItem.title}</h2>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="max-h-[64vh] overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold text-gray-700 md:col-span-2">
                  Title
                  <input
                    value={editForm.title}
                    onChange={(event) => updateEditField("title", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </label>

                {activeTab === "messages" ? (
                  <>
                    <label className="text-sm font-semibold text-gray-700">
                      Tone
                      <input
                        value={editForm.tone}
                        onChange={(event) => updateEditField("tone", event.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                    </label>
                    <label className="text-sm font-semibold text-gray-700">
                      Active Date
                      <input
                        type="date"
                        value={editForm.active_date}
                        onChange={(event) => updateEditField("active_date", event.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                    </label>
                    <label className="text-sm font-semibold text-gray-700 md:col-span-2">
                      Body
                      <textarea
                        value={editForm.body}
                        onChange={(event) => updateEditField("body", event.target.value)}
                        rows={6}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                    </label>
                  </>
                ) : (
                  <label className="text-sm font-semibold text-gray-700 md:col-span-2">
                    Description
                    <textarea
                      value={editForm.description}
                      onChange={(event) => updateEditField("description", event.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    />
                  </label>
                )}

                {activeTab === "rewards" && (
                  <>
                    <label className="text-sm font-semibold text-gray-700">
                      Cost Hearts
                      <input
                        type="number"
                        min="0"
                        value={editForm.cost_hearts}
                        onChange={(event) => updateEditField("cost_hearts", event.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                    </label>
                    <label className="text-sm font-semibold text-gray-700">
                      Category
                      <input
                        value={editForm.category}
                        onChange={(event) => updateEditField("category", event.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                    </label>
                    <label className="text-sm font-semibold text-gray-700">
                      Stock Limit
                      <input
                        type="number"
                        min="0"
                        value={editForm.stock_limit}
                        onChange={(event) => updateEditField("stock_limit", event.target.value)}
                        placeholder="Unlimited"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                    </label>
                  </>
                )}

                {(activeTab === "quests" || activeTab === "minigames") && (
                  <>
                    <label className="text-sm font-semibold text-gray-700">
                      Type
                      <select
                        value={editForm.type}
                        onChange={(event) => updateEditField("type", event.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                      >
                        {(activeTab === "quests" ? QUEST_TYPES : MINI_GAME_TYPES).map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-semibold text-gray-700">
                      Difficulty
                      <select
                        value={editForm.difficulty}
                        onChange={(event) => updateEditField("difficulty", event.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                      >
                        {(activeTab === "quests" ? QUEST_DIFFICULTIES : MINI_GAME_DIFFICULTIES).map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-semibold text-gray-700">
                      XP Reward
                      <input
                        type="number"
                        min="0"
                        value={editForm.xp_reward}
                        onChange={(event) => updateEditField("xp_reward", event.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                    </label>
                    <label className="text-sm font-semibold text-gray-700">
                      Hearts Reward
                      <input
                        type="number"
                        min="0"
                        value={editForm.hearts_reward}
                        onChange={(event) => updateEditField("hearts_reward", event.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                    </label>
                    {activeTab === "minigames" && (
                      <label className="text-sm font-semibold text-gray-700">
                        Active Date
                        <input
                          type="date"
                          value={editForm.active_date}
                          onChange={(event) => updateEditField("active_date", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                        />
                      </label>
                    )}
                    <label className="text-sm font-semibold text-gray-700 md:col-span-2">
                      Prompt
                      <textarea
                        value={editForm.prompt}
                        onChange={(event) => updateEditField("prompt", event.target.value)}
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                    </label>
                    <label className="text-sm font-semibold text-gray-700 md:col-span-2">
                      Options
                      <textarea
                        value={editForm.options_json}
                        onChange={(event) => updateEditField("options_json", event.target.value)}
                        rows={4}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                    </label>
                    <label className="text-sm font-semibold text-gray-700 md:col-span-2">
                      Correct Answer
                      <input
                        value={editForm.correct_answer}
                        onChange={(event) => updateEditField("correct_answer", event.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                    </label>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 p-5">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                disabled={busyId === editingItem.id}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {busyId === editingItem.id ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
