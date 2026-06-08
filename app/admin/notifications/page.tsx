"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  notification_type: string;
  trigger_type: string;
  send_time: string;
  start_date?: string | null;
  end_date?: string | null;
  timezone?: string | null;
  publish_status?: string | null;
  is_active: boolean;
  last_sent_at?: string | null;
  notification_messages?: NotificationMessage[];
  notification_delivery_logs?: Array<{ id: string; status: string; created_at?: string }>;
};

type NotificationMessage = {
  id: string;
  campaign_id: string;
  title: string;
  body: string;
  weight: number;
  is_active: boolean;
};

const notificationTypes = [
  "mood_reminder",
  "minigame_reminder",
  "quest_reminder",
  "hero_message",
  "manual_broadcast",
];

const triggerTypes = ["daily", "mood_missing", "minigame_missing", "manual_broadcast"];

const emptyForm = {
  name: "",
  notification_type: "mood_reminder",
  trigger_type: "mood_missing",
  send_time: "09:00",
  start_date: "",
  end_date: "",
  message_title: "Reminder dari Birthday Awa",
  message_body: "Halo {{username}}, jangan lupa cek dashboard hari ini ya.",
};

function getDeliveryStats(campaign: Campaign) {
  const logs = campaign.notification_delivery_logs ?? [];
  return {
    sent: logs.filter((log) => log.status === "sent").length,
    failed: logs.filter((log) => log.status === "failed").length,
    total: logs.length,
  };
}

export default function AdminNotificationsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [messageDrafts, setMessageDrafts] = useState<Record<string, { title: string; body: string; weight: string }>>({});

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/notifications");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to fetch notification campaigns");
      setCampaigns(json.campaigns ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const totals = useMemo(() => {
    return campaigns.reduce(
      (acc, campaign) => {
        const stats = getDeliveryStats(campaign);
        acc.campaigns += 1;
        acc.active += campaign.is_active ? 1 : 0;
        acc.sent += stats.sent;
        acc.failed += stats.failed;
        return acc;
      },
      { campaigns: 0, active: 0, sent: 0, failed: 0 },
    );
  }, [campaigns]);

  const updateCampaign = (campaign: Campaign) => {
    setCampaigns((current) => current.map((item) => (item.id === campaign.id ? campaign : item)));
  };

  const createCampaign = async () => {
    try {
      setBusyId("create");
      setNotice(null);
      setError(null);
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          notification_type: form.notification_type,
          trigger_type: form.trigger_type,
          send_time: form.send_time,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          messages: [{ title: form.message_title, body: form.message_body, weight: 1 }],
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to create campaign");
      setCampaigns((current) => [json.campaign, ...current]);
      setForm(emptyForm);
      setShowCreate(false);
      setNotice("Notification campaign created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  const toggleCampaign = async (campaign: Campaign) => {
    try {
      setBusyId(campaign.id);
      setNotice(null);
      setError(null);
      const nextCampaign = { ...campaign, is_active: !campaign.is_active };
      setCampaigns((current) => current.map((item) => (item.id === campaign.id ? nextCampaign : item)));
      const res = await fetch(`/api/admin/notifications/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextCampaign),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to update campaign");
      updateCampaign(json.campaign);
      setNotice("Campaign updated.");
    } catch (err) {
      setCampaigns((current) => current.map((item) => (item.id === campaign.id ? campaign : item)));
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  const deleteCampaign = async (campaign: Campaign) => {
    if (!confirm(`Delete campaign "${campaign.name}"?`)) return;
    const previous = campaigns;
    try {
      setBusyId(campaign.id);
      setNotice(null);
      setError(null);
      setCampaigns((current) => current.filter((item) => item.id !== campaign.id));
      const res = await fetch(`/api/admin/notifications/${campaign.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to delete campaign");
      setNotice("Campaign deleted.");
    } catch (err) {
      setCampaigns(previous);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  const addMessage = async (campaign: Campaign) => {
    const draft = messageDrafts[campaign.id] ?? { title: "", body: "", weight: "1" };
    try {
      setBusyId(`message-${campaign.id}`);
      setNotice(null);
      setError(null);
      const res = await fetch(`/api/admin/notifications/${campaign.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          body: draft.body,
          weight: Number(draft.weight) || 1,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to add message");
      setCampaigns((current) =>
        current.map((item) =>
          item.id === campaign.id
            ? { ...item, notification_messages: [...(item.notification_messages ?? []), json.message] }
            : item,
        ),
      );
      setMessageDrafts((current) => ({ ...current, [campaign.id]: { title: "", body: "", weight: "1" } }));
      setNotice("Message variant added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  const sendNow = async (campaign: Campaign) => {
    try {
      setBusyId(`send-${campaign.id}`);
      setNotice(null);
      setError(null);
      const res = await fetch("/api/admin/notifications/manual-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaign.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to send campaign");
      await fetchCampaigns();
      setNotice(`Broadcast processed. Sent ${json.sent ?? 0}, failed ${json.failed ?? 0}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  const runDue = async () => {
    try {
      setBusyId("run-due");
      setNotice(null);
      setError(null);
      const res = await fetch("/api/admin/notifications/run-due", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to run due campaigns");
      await fetchCampaigns();
      setNotice(`Due campaigns processed: ${(json.results ?? []).length}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Notification Center</h1>
          <p className="mt-2 text-gray-600">Manage WhatsApp reminders, broadcasts, and delivery logs.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={runDue}
            disabled={busyId === "run-due"}
            className="rounded-lg border border-gray-300 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {busyId === "run-due" ? "Running..." : "Run Due"}
          </button>
          <button
            onClick={() => setShowCreate((current) => !current)}
            className="rounded-lg bg-purple-600 px-5 py-3 text-sm font-bold text-white hover:bg-purple-700"
          >
            Create Campaign
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Campaigns", totals.campaigns],
          ["Active", totals.active],
          ["Sent", totals.sent],
          ["Failed", totals.failed],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {notice && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">{notice}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      {showCreate && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-xl font-bold text-gray-900">New Campaign</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-gray-700 md:col-span-2">
              Campaign Name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Notification Type
              <select value={form.notification_type} onChange={(event) => setForm({ ...form, notification_type: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900">
                {notificationTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Trigger
              <select value={form.trigger_type} onChange={(event) => setForm({ ...form, trigger_type: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900">
                {triggerTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Send Time
              <input type="time" value={form.send_time} onChange={(event) => setForm({ ...form, send_time: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Start Date
              <input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              First Message Title
              <input value={form.message_title} onChange={(event) => setForm({ ...form, message_title: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
            </label>
            <label className="text-sm font-semibold text-gray-700 md:col-span-2">
              First Message Body
              <textarea value={form.message_body} onChange={(event) => setForm({ ...form, message_body: event.target.value })} rows={4} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={createCampaign} disabled={busyId === "create"} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50">{busyId === "create" ? "Creating..." : "Save Campaign"}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center text-gray-500">Loading campaigns...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {campaigns.map((campaign) => {
            const stats = getDeliveryStats(campaign);
            const draft = messageDrafts[campaign.id] ?? { title: "", body: "", weight: "1" };
            return (
              <article key={campaign.id} className="rounded-lg border border-gray-200 bg-white p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900">{campaign.name}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${campaign.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {campaign.is_active ? "active" : "inactive"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-gray-500">
                      {campaign.notification_type} / {campaign.trigger_type} / {campaign.send_time}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Last sent: {campaign.last_sent_at ? new Date(campaign.last_sent_at).toLocaleString() : "Never"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => toggleCampaign(campaign)} disabled={busyId === campaign.id} className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200 disabled:opacity-50">
                      {campaign.is_active ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => sendNow(campaign)} disabled={busyId === `send-${campaign.id}`} className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50">
                      {busyId === `send-${campaign.id}` ? "Sending..." : "Send Now"}
                    </button>
                    <button onClick={() => deleteCampaign(campaign)} disabled={busyId === campaign.id} className="rounded-lg bg-red-100 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-200 disabled:opacity-50">
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3 text-center"><p className="text-xs font-bold text-gray-500">Logs</p><p className="text-lg font-bold text-gray-900">{stats.total}</p></div>
                  <div className="rounded-lg bg-green-50 p-3 text-center"><p className="text-xs font-bold text-green-600">Sent</p><p className="text-lg font-bold text-green-700">{stats.sent}</p></div>
                  <div className="rounded-lg bg-red-50 p-3 text-center"><p className="text-xs font-bold text-red-600">Failed</p><p className="text-lg font-bold text-red-700">{stats.failed}</p></div>
                </div>

                <div className="mt-5 space-y-3">
                  <p className="text-sm font-bold uppercase tracking-wide text-gray-500">Message Variants</p>
                  {(campaign.notification_messages ?? []).map((message) => (
                    <div key={message.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-gray-900">{message.title}</p>
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-gray-600">weight {message.weight}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-600">{message.body}</p>
                    </div>
                  ))}

                  <div className="rounded-lg border border-dashed border-gray-300 p-3">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_90px]">
                      <input value={draft.title} onChange={(event) => setMessageDrafts({ ...messageDrafts, [campaign.id]: { ...draft, title: event.target.value } })} placeholder="Variant title" className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
                      <input type="number" min="1" value={draft.weight} onChange={(event) => setMessageDrafts({ ...messageDrafts, [campaign.id]: { ...draft, weight: event.target.value } })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
                    </div>
                    <textarea value={draft.body} onChange={(event) => setMessageDrafts({ ...messageDrafts, [campaign.id]: { ...draft, body: event.target.value } })} placeholder="Variant body" rows={3} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
                    <button onClick={() => addMessage(campaign)} disabled={busyId === `message-${campaign.id}`} className="mt-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50">
                      {busyId === `message-${campaign.id}` ? "Adding..." : "Add Variant"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
