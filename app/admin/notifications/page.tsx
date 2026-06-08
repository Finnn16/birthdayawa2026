"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type NotificationType = "mood" | "quest" | "minigame" | "event" | "reward" | "letter" | "streak" | "system" | "custom";
type TriggerType =
  | "mood_not_filled"
  | "quest_not_completed"
  | "minigame_not_played"
  | "streak_milestone"
  | "event_countdown"
  | "letter_unlocked"
  | "reward_available"
  | "always_send"
  | "manual_send";

type Campaign = {
  id: string;
  name: string;
  notification_type: NotificationType;
  trigger_type: TriggerType;
  send_time: string;
  start_date?: string | null;
  end_date?: string | null;
  timezone: string;
  publish_status: string;
  publish_at?: string | null;
  is_active: boolean;
  metadata_json?: { target_date?: string; days_before?: number } | null;
  last_sent_at?: string | null;
  messages?: NotificationMessage[];
  delivery_count?: number;
};

type NotificationMessage = {
  id: string;
  campaign_id: string;
  title: string;
  body: string;
  weight: number;
  is_active: boolean;
  created_at?: string | null;
};

type DeliveryLog = {
  id: string;
  campaign_id?: string | null;
  user_id?: string | null;
  notification_title: string;
  notification_body: string;
  status: string;
  delivery_channel: string;
  error_message?: string | null;
  sent_at?: string | null;
  created_at?: string | null;
  users?: { username?: string | null; email?: string | null } | null;
};

type NotificationUser = {
  id: string;
  username?: string | null;
  email?: string | null;
  phone_number?: string | null;
};

type Analytics = {
  totalCampaigns: number;
  activeCampaigns: number;
  totalMessages: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  successRate: number;
};

type NotificationData = {
  campaigns: Campaign[];
  messages: NotificationMessage[];
  logs: DeliveryLog[];
  users: NotificationUser[];
  analytics: Analytics;
};

type CampaignForm = {
  name: string;
  notification_type: NotificationType;
  trigger_type: TriggerType;
  send_time: string;
  start_date: string;
  end_date: string;
  timezone: string;
  publish_status: string;
  is_active: boolean;
  target_date: string;
  days_before: string;
  message_title: string;
  message_body: string;
};

type MessageForm = {
  campaign_id: string;
  title: string;
  body: string;
  weight: string;
  is_active: boolean;
};

const NOTIFICATION_TYPES: NotificationType[] = ["mood", "quest", "minigame", "event", "reward", "letter", "streak", "system", "custom"];
const TRIGGER_TYPES: TriggerType[] = [
  "mood_not_filled",
  "quest_not_completed",
  "minigame_not_played",
  "streak_milestone",
  "event_countdown",
  "letter_unlocked",
  "reward_available",
  "always_send",
  "manual_send",
];

const TRIGGER_DESCRIPTIONS: Record<TriggerType, string> = {
  mood_not_filled: "Send only when target user has not filled today's mood.",
  quest_not_completed: "Send when today's active quest is not completed.",
  minigame_not_played: "Send when active mini game has not been played.",
  streak_milestone: "Reserved for streak milestone campaigns.",
  event_countdown: "Send when target date is N days away.",
  letter_unlocked: "Reserved for letter unlock campaigns.",
  reward_available: "Reserved for reward availability campaigns.",
  always_send: "Send whenever the campaign schedule is due.",
  manual_send: "Available for manual broadcast only.",
};

const emptyCampaignForm: CampaignForm = {
  name: "",
  notification_type: "mood",
  trigger_type: "mood_not_filled",
  send_time: "20:00",
  start_date: "",
  end_date: "",
  timezone: "Asia/Jakarta",
  publish_status: "published",
  is_active: true,
  target_date: "",
  days_before: "0",
  message_title: "",
  message_body: "",
};

const emptyMessageForm: MessageForm = {
  campaign_id: "",
  title: "",
  body: "",
  weight: "1",
  is_active: true,
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function statusClass(status: string) {
  if (status === "sent" || status === "delivered") return "bg-green-100 text-green-700";
  if (status === "failed") return "bg-red-100 text-red-700";
  if (status === "published" || status === "active") return "bg-purple-100 text-purple-700";
  return "bg-gray-100 text-gray-700";
}

export default function NotificationCenterPage() {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [data, setData] = useState<NotificationData>({
    campaigns: [],
    messages: [],
    logs: [],
    users: [],
    analytics: {
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalMessages: 0,
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      successRate: 0,
    },
  });
  const [campaignForm, setCampaignForm] = useState<CampaignForm>(emptyCampaignForm);
  const [messageForm, setMessageForm] = useState<MessageForm>(emptyMessageForm);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualBody, setManualBody] = useState("");
  const [manualTarget, setManualTarget] = useState("all");
  const [manualCampaignId, setManualCampaignId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/notifications");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load notifications");
      setData(json);
      const firstCampaignId = json.campaigns?.[0]?.id ?? "";
      setSelectedCampaignId((current) => current || firstCampaignId);
      setMessageForm((current) => ({ ...current, campaign_id: current.campaign_id || firstCampaignId }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedCampaign = useMemo(
    () => data.campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? data.campaigns[0],
    [data.campaigns, selectedCampaignId],
  );

  const selectedMessages = useMemo(
    () => data.messages.filter((message) => message.campaign_id === selectedCampaign?.id),
    [data.messages, selectedCampaign?.id],
  );

  const updateCampaignForm = (field: keyof CampaignForm, value: string | boolean) => {
    setCampaignForm((current) => ({ ...current, [field]: value }));
  };

  const updateMessageForm = (field: keyof MessageForm, value: string | boolean) => {
    setMessageForm((current) => ({ ...current, [field]: value }));
  };

  const campaignPayload = () => ({
    name: campaignForm.name,
    notification_type: campaignForm.notification_type,
    trigger_type: campaignForm.trigger_type,
    send_time: campaignForm.send_time,
    start_date: campaignForm.start_date || null,
    end_date: campaignForm.end_date || null,
    timezone: campaignForm.timezone,
    publish_status: campaignForm.publish_status,
    is_active: campaignForm.is_active,
    metadata_json:
      campaignForm.trigger_type === "event_countdown"
        ? {
            target_date: campaignForm.target_date || null,
            days_before: Number(campaignForm.days_before) || 0,
          }
        : null,
    message: campaignForm.message_title || campaignForm.message_body
      ? {
          title: campaignForm.message_title,
          body: campaignForm.message_body,
          weight: 1,
          is_active: true,
        }
      : undefined,
  });

  const resetCampaignForm = () => {
    setCampaignForm(emptyCampaignForm);
    setEditingCampaignId(null);
  };

  const saveCampaign = async () => {
    try {
      setBusy(true);
      setNotice(null);
      setError(null);
      const endpoint = editingCampaignId ? `/api/admin/notifications/${editingCampaignId}` : "/api/admin/notifications";
      const res = await fetch(endpoint, {
        method: editingCampaignId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignPayload()),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to save campaign");

      setNotice(editingCampaignId ? "Campaign updated." : "Campaign created.");
      resetCampaignForm();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  const editCampaign = (campaign: Campaign) => {
    setEditingCampaignId(campaign.id);
    setCampaignForm({
      name: campaign.name,
      notification_type: campaign.notification_type,
      trigger_type: campaign.trigger_type,
      send_time: campaign.send_time?.slice(0, 5) || "09:00",
      start_date: campaign.start_date?.slice(0, 10) ?? "",
      end_date: campaign.end_date?.slice(0, 10) ?? "",
      timezone: campaign.timezone || "Asia/Jakarta",
      publish_status: campaign.publish_status || "published",
      is_active: campaign.is_active,
      target_date: campaign.metadata_json?.target_date ?? "",
      days_before: String(campaign.metadata_json?.days_before ?? 0),
      message_title: "",
      message_body: "",
    });
    setActiveTab("campaigns");
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Delete this notification campaign? Message pool and logs references will be updated.")) return;
    const previous = data;
    try {
      setData((current) => ({
        ...current,
        campaigns: current.campaigns.filter((campaign) => campaign.id !== id),
        messages: current.messages.filter((message) => message.campaign_id !== id),
      }));
      const res = await fetch(`/api/admin/notifications/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to delete campaign");
      setNotice("Campaign deleted.");
    } catch (err) {
      setData(previous);
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const saveMessage = async () => {
    try {
      setBusy(true);
      setNotice(null);
      setError(null);
      const campaignId = messageForm.campaign_id || selectedCampaign?.id;
      if (!campaignId) throw new Error("Pilih campaign terlebih dahulu.");
      const res = await fetch(`/api/admin/notifications/${campaignId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: messageForm.title,
          body: messageForm.body,
          weight: Number(messageForm.weight) || 1,
          is_active: messageForm.is_active,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to save message");
      setData((current) => ({ ...current, messages: [json.message, ...current.messages] }));
      setMessageForm({ ...emptyMessageForm, campaign_id: campaignId });
      setNotice("Message added to pool.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  const toggleMessage = async (message: NotificationMessage) => {
    const next = { ...message, is_active: !message.is_active };
    setData((current) => ({
      ...current,
      messages: current.messages.map((item) => (item.id === message.id ? next : item)),
    }));
    const res = await fetch(`/api/admin/notifications/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!res.ok) await fetchData();
  };

  const deleteMessage = async (message: NotificationMessage) => {
    if (!confirm("Delete this message from pool?")) return;
    const previous = data.messages;
    setData((current) => ({ ...current, messages: current.messages.filter((item) => item.id !== message.id) }));
    const res = await fetch(`/api/admin/notifications/messages/${message.id}`, { method: "DELETE" });
    if (!res.ok) {
      setData((current) => ({ ...current, messages: previous }));
      setError("Failed to delete message.");
    }
  };

  const sendManualBroadcast = async () => {
    try {
      setBusy(true);
      setNotice(null);
      setError(null);
      const res = await fetch("/api/admin/notifications/manual-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: manualTitle,
          body: manualBody,
          target_user_id: manualTarget,
          campaign_id: manualCampaignId || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to send manual broadcast");
      setNotice(`Manual broadcast processed. Sent: ${json.sent}, Failed: ${json.failed}.`);
      setManualTitle("");
      setManualBody("");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  const runDueCampaigns = async () => {
    try {
      setBusy(true);
      setNotice(null);
      setError(null);
      const res = await fetch("/api/admin/notifications/run-due", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to run due campaigns");
      setNotice(`Processed ${json.processedCampaigns} campaigns.`);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  const tabs = [
    { id: "campaigns", label: "Campaigns" },
    { id: "messages", label: "Message Pool" },
    { id: "rules", label: "Trigger Rules" },
    { id: "broadcast", label: "Manual Broadcast" },
    { id: "history", label: "Delivery History" },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Notification Center</h1>
          <p className="mt-2 text-gray-600">Manage notification campaigns, message rotation, manual broadcasts, and delivery history.</p>
        </div>
        <button
          type="button"
          onClick={runDueCampaigns}
          disabled={busy}
          className="rounded-lg bg-purple-600 px-5 py-3 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50"
        >
          Run Campaigns
        </button>
      </div>

      {notice && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">{notice}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <div className="overflow-x-auto border-b border-gray-200">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-4 py-3 text-sm font-bold ${activeTab === tab.id ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-900"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-500">Loading notification center...</div>
      ) : (
        <>
          {activeTab === "campaigns" && (
            <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
              <section className="rounded-lg border border-gray-200 bg-white p-5">
                <h2 className="text-xl font-bold text-gray-900">{editingCampaignId ? "Edit Campaign" : "Create Campaign"}</h2>
                <div className="mt-4 grid grid-cols-1 gap-3">
                  <label className="text-sm font-semibold text-gray-700">
                    Campaign Name
                    <input value={campaignForm.name} onChange={(event) => updateCampaignForm("name", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Notification Type
                      <select value={campaignForm.notification_type} onChange={(event) => updateCampaignForm("notification_type", event.target.value as NotificationType)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                        {NOTIFICATION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </label>
                    <label className="text-sm font-semibold text-gray-700">
                      Trigger
                      <select value={campaignForm.trigger_type} onChange={(event) => updateCampaignForm("trigger_type", event.target.value as TriggerType)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                        {TRIGGER_TYPES.map((trigger) => <option key={trigger} value={trigger}>{trigger}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label className="text-sm font-semibold text-gray-700">
                      Send Time
                      <input type="time" value={campaignForm.send_time} onChange={(event) => updateCampaignForm("send_time", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                    </label>
                    <label className="text-sm font-semibold text-gray-700">
                      Start Date
                      <input type="date" value={campaignForm.start_date} onChange={(event) => updateCampaignForm("start_date", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                    </label>
                    <label className="text-sm font-semibold text-gray-700">
                      End Date
                      <input type="date" value={campaignForm.end_date} onChange={(event) => updateCampaignForm("end_date", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                    </label>
                  </div>
                  {campaignForm.trigger_type === "event_countdown" && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Target Date
                        <input type="date" value={campaignForm.target_date} onChange={(event) => updateCampaignForm("target_date", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                      </label>
                      <label className="text-sm font-semibold text-gray-700">
                        Days Before
                        <input type="number" min="0" value={campaignForm.days_before} onChange={(event) => updateCampaignForm("days_before", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                      </label>
                    </div>
                  )}
                  {!editingCampaignId && (
                    <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
                      <p className="text-sm font-bold text-purple-900">Initial Message</p>
                      <input placeholder="Title" value={campaignForm.message_title} onChange={(event) => updateCampaignForm("message_title", event.target.value)} className="mt-2 w-full rounded-lg border border-purple-200 px-3 py-2 text-sm" />
                      <textarea placeholder="Body" value={campaignForm.message_body} onChange={(event) => updateCampaignForm("message_body", event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-purple-200 px-3 py-2 text-sm" />
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input type="checkbox" checked={campaignForm.is_active} onChange={(event) => updateCampaignForm("is_active", event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-purple-600" />
                    Active campaign
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={saveCampaign} disabled={busy} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50">Save Campaign</button>
                    {editingCampaignId && <button onClick={resetCampaignForm} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">Cancel</button>}
                  </div>
                </div>
              </section>

              <section className="grid gap-3">
                {data.campaigns.map((campaign) => (
                  <article key={campaign.id} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900">{campaign.name}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${campaign.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{campaign.is_active ? "active" : "inactive"}</span>
                          <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700">{campaign.notification_type}</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">{campaign.trigger_type} at {campaign.send_time?.slice(0, 5)} {campaign.timezone}</p>
                        <p className="mt-1 text-xs font-semibold text-gray-500">{campaign.messages?.length ?? 0} messages / {campaign.delivery_count ?? 0} deliveries / last sent {formatDateTime(campaign.last_sent_at)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => editCampaign(campaign)} className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-200">Edit</button>
                        <button onClick={() => deleteCampaign(campaign.id)} className="rounded-lg bg-red-100 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-200">Delete</button>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            </div>
          )}

          {activeTab === "messages" && (
            <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
              <section className="rounded-lg border border-gray-200 bg-white p-5">
                <h2 className="text-xl font-bold text-gray-900">Add Message</h2>
                <label className="mt-4 block text-sm font-semibold text-gray-700">
                  Campaign
                  <select value={messageForm.campaign_id || selectedCampaign?.id || ""} onChange={(event) => updateMessageForm("campaign_id", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                    {data.campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
                  </select>
                </label>
                <input placeholder="Title" value={messageForm.title} onChange={(event) => updateMessageForm("title", event.target.value)} className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <textarea placeholder="Body. Supports {username} and {email}" value={messageForm.body} onChange={(event) => updateMessageForm("body", event.target.value)} rows={5} className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <label className="mt-3 block text-sm font-semibold text-gray-700">
                  Weight
                  <input type="number" min="1" value={messageForm.weight} onChange={(event) => updateMessageForm("weight", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </label>
                <button onClick={saveMessage} disabled={busy || !data.campaigns.length} className="mt-4 w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50">Add Message</button>
              </section>

              <section className="space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {data.campaigns.map((campaign) => (
                    <button key={campaign.id} onClick={() => setSelectedCampaignId(campaign.id)} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold ${selectedCampaign?.id === campaign.id ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{campaign.name}</button>
                  ))}
                </div>
                {selectedMessages.map((message) => (
                  <article key={message.id} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900">{message.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-gray-600">{message.body}</p>
                        <p className="mt-2 text-xs font-semibold text-gray-500">Weight {message.weight} / {message.is_active ? "active" : "inactive"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => toggleMessage(message)} className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200">{message.is_active ? "Disable" : "Enable"}</button>
                        <button onClick={() => deleteMessage(message)} className="rounded-lg bg-red-100 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-200">Delete</button>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            </div>
          )}

          {activeTab === "rules" && (
            <div className="grid gap-3 md:grid-cols-2">
              {TRIGGER_TYPES.map((trigger) => (
                <article key={trigger} className="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="font-bold text-gray-900">{trigger}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{TRIGGER_DESCRIPTIONS[trigger]}</p>
                </article>
              ))}
            </div>
          )}

          {activeTab === "broadcast" && (
            <section className="max-w-3xl rounded-lg border border-gray-200 bg-white p-5">
              <h2 className="text-xl font-bold text-gray-900">Manual Broadcast</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm font-semibold text-gray-700">
                  Target User
                  <select value={manualTarget} onChange={(event) => setManualTarget(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                    <option value="all">All users</option>
                    {data.users.map((user) => <option key={user.id} value={user.id}>{user.username || user.email || user.id}</option>)}
                  </select>
                </label>
                <label className="text-sm font-semibold text-gray-700">
                  Link Campaign
                  <select value={manualCampaignId} onChange={(event) => setManualCampaignId(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                    <option value="">No campaign</option>
                    {data.campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
                  </select>
                </label>
              </div>
              <input placeholder="Title" value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <textarea placeholder="Message body" value={manualBody} onChange={(event) => setManualBody(event.target.value)} rows={6} className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <button onClick={sendManualBroadcast} disabled={busy} className="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50">Send Now</button>
            </section>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              {data.logs.map((log) => (
                <article key={log.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-gray-900">{log.notification_title}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(log.status)}`}>{log.status}</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">{log.notification_body}</p>
                      {log.error_message && <p className="mt-2 text-sm font-semibold text-red-600">{log.error_message}</p>}
                    </div>
                    <div className="text-sm font-semibold text-gray-500 md:text-right">
                      <p>{log.users?.username || log.users?.email || "Unknown user"}</p>
                      <p>{formatDateTime(log.created_at)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["Campaigns", data.analytics.totalCampaigns],
                ["Active Campaigns", data.analytics.activeCampaigns],
                ["Messages", data.analytics.totalMessages],
                ["Sent", data.analytics.totalSent],
                ["Failed", data.analytics.totalFailed],
                ["Success Rate", `${data.analytics.successRate}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-gray-200 bg-white p-5">
                  <p className="text-sm font-bold uppercase tracking-wide text-gray-500">{label}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
