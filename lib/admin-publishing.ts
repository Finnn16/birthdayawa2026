export const PUBLISH_STATUSES = ["draft", "scheduled", "published", "archived"] as const;

export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

export type ContentKind = "quests" | "messages" | "minigames" | "rewards";

const DATE_COLUMN_BY_KIND: Partial<Record<ContentKind, string>> = {
  messages: "active_date",
  minigames: "active_date",
};

export function normalizePublishStatus(value: unknown, fallback: PublishStatus = "published"): PublishStatus {
  return PUBLISH_STATUSES.includes(value as PublishStatus) ? (value as PublishStatus) : fallback;
}

export function normalizePublishAt(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function toDateOnly(value: string | null) {
  if (!value) return null;
  return value.slice(0, 10);
}

export function getPublishPatch(
  statusValue: unknown,
  publishAtValue: unknown,
  kind?: ContentKind,
) {
  const status = normalizePublishStatus(statusValue);
  const publishAt = normalizePublishAt(publishAtValue);
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    publish_status: status,
    publish_at: status === "scheduled" ? publishAt : null,
    is_active: status === "published",
  };

  if (status === "published") {
    patch.published_at = now;
    patch.archived_at = null;
  } else if (status === "archived") {
    patch.archived_at = now;
  } else {
    patch.published_at = null;
    patch.archived_at = null;
  }

  const dateColumn = kind ? DATE_COLUMN_BY_KIND[kind] : undefined;
  if (dateColumn && publishAt) {
    patch[dateColumn] = toDateOnly(publishAt);
  }

  return patch;
}

export function getDraftDuplicatePatch(kind?: ContentKind) {
  const patch: Record<string, unknown> = {
    is_active: false,
    publish_status: "draft",
    publish_at: null,
    published_at: null,
    archived_at: null,
  };

  const dateColumn = kind ? DATE_COLUMN_BY_KIND[kind] : undefined;
  if (dateColumn) patch[dateColumn] = null;

  return patch;
}

export function inferPublishStatus(item: {
  publish_status?: string | null;
  is_active?: boolean | null;
}) {
  if (item.publish_status) return normalizePublishStatus(item.publish_status, "draft");
  return item.is_active ? "published" : "draft";
}
