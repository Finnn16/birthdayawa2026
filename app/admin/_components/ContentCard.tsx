"use client";

type ContentCardProps = {
  title: string;
  type?: string;
  activeDate?: string;
  reward?: { xp?: number; hearts?: number };
  status?: "draft" | "scheduled" | "published" | "archived" | "active" | "inactive" | "pending";
  lastUpdated?: string;
  publishAt?: string;
  isBusy?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSchedule?: () => void;
  children?: React.ReactNode;
};

export function ContentCard({
  title,
  type,
  activeDate,
  reward,
  status = "inactive",
  lastUpdated,
  publishAt,
  isBusy = false,
  onEdit,
  onDelete,
  onDuplicate,
  onSchedule,
  children,
}: ContentCardProps) {
  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    scheduled: "bg-amber-100 text-amber-700",
    published: "bg-green-100 text-green-700",
    archived: "bg-slate-100 text-slate-700",
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-700",
    pending: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 pl-10">
          <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
          {type && <p className="text-sm text-gray-500">{type}</p>}
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[status]}`}>
          {status}
        </div>
      </div>

      {children && <div className="mb-3 text-sm text-gray-600">{children}</div>}

      <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-500">
        {activeDate && (
          <div>
            <span className="font-semibold">Date:</span> {activeDate}
          </div>
        )}
        {publishAt && (
          <div>
            <span className="font-semibold">Publish:</span> {new Date(publishAt).toLocaleString()}
          </div>
        )}
        {reward?.xp && (
          <div>
            <span className="font-semibold">XP:</span> +{reward.xp}
          </div>
        )}
        {reward?.hearts && (
          <div>
            <span className="font-semibold">Hearts:</span> +{reward.hearts}
          </div>
        )}
        {lastUpdated && (
          <div>
            <span className="font-semibold">Updated:</span> {lastUpdated}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-end">
        {onSchedule && (
          <button
            onClick={onSchedule}
            disabled={isBusy}
            className="px-3 py-1 text-sm rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 font-semibold"
          >
            Schedule
          </button>
        )}
        {onDuplicate && (
          <button
            onClick={onDuplicate}
            disabled={isBusy}
            className="px-3 py-1 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 font-semibold"
          >
            Duplicate
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            disabled={isBusy}
            className="px-3 py-1 text-sm rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold"
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={isBusy}
            className="px-3 py-1 text-sm rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-semibold"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
