"use client";

type ContentCardProps = {
  title: string;
  type?: string;
  activeDate?: string;
  reward?: { xp?: number; hearts?: number };
  status?: "active" | "inactive" | "pending";
  lastUpdated?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  children?: React.ReactNode;
};

export function ContentCard({
  title,
  type,
  activeDate,
  reward,
  status = "inactive",
  lastUpdated,
  onEdit,
  onDelete,
  children,
}: ContentCardProps) {
  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-700",
    pending: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
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

      <div className="flex gap-2 justify-end">
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-3 py-1 text-sm rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold"
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="px-3 py-1 text-sm rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-semibold"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
