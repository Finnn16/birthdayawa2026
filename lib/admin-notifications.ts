import twilio from "twilio";
import { APP_TIME_ZONE, getAdminEmails } from "@/lib/app-config";
import { getTodayDateString } from "@/lib/date";
import { formatPhoneNumber } from "@/lib/twilioUtils";

export const NOTIFICATION_TYPES = [
  "mood",
  "quest",
  "minigame",
  "event",
  "reward",
  "letter",
  "streak",
  "system",
  "custom",
] as const;

export const NOTIFICATION_TRIGGERS = [
  "mood_not_filled",
  "quest_not_completed",
  "minigame_not_played",
  "streak_milestone",
  "event_countdown",
  "letter_unlocked",
  "reward_available",
  "always_send",
  "manual_send",
] as const;

type SupabaseLike = {
  from: (table: string) => any;
};

type Campaign = {
  id: string;
  name: string;
  trigger_type: string;
  send_time: string;
  start_date?: string | null;
  end_date?: string | null;
  timezone?: string | null;
  metadata_json?: Record<string, unknown> | null;
};

type NotificationMessage = {
  id: string;
  title: string;
  body: string;
  weight?: number | null;
};

type NotificationUser = {
  id: string;
  username?: string | null;
  email?: string | null;
  phone_number?: string | null;
  reminder_enabled?: boolean | null;
  role?: string | null;
};

let twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
  if (!twilioClient) twilioClient = twilio(accountSid, authToken);
  return twilioClient;
}

function getWhatsAppFromAddress() {
  const raw = process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_PHONE_NUMBER || "";
  if (!raw) return "";
  return raw.startsWith("whatsapp:") ? raw : `whatsapp:${raw}`;
}

export function authResponse(error: "Unauthorized" | "Forbidden" | null) {
  if (error === "Unauthorized") return { error, status: 401 };
  if (error === "Forbidden") return { error, status: 403 };
  return null;
}

export function normalizeCampaignPayload(payload: Record<string, unknown>) {
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const notificationType = typeof payload.notification_type === "string" ? payload.notification_type : "custom";
  const triggerType = typeof payload.trigger_type === "string" ? payload.trigger_type : "manual_send";
  const sendTime = typeof payload.send_time === "string" && payload.send_time ? payload.send_time : "09:00";

  if (!name) return { error: "Campaign name wajib diisi." };
  if (!NOTIFICATION_TYPES.includes(notificationType as (typeof NOTIFICATION_TYPES)[number])) {
    return { error: "Notification type tidak valid." };
  }
  if (!NOTIFICATION_TRIGGERS.includes(triggerType as (typeof NOTIFICATION_TRIGGERS)[number])) {
    return { error: "Trigger type tidak valid." };
  }

  return {
    data: {
      name,
      notification_type: notificationType,
      trigger_type: triggerType,
      send_time: sendTime,
      start_date: typeof payload.start_date === "string" && payload.start_date ? payload.start_date : null,
      end_date: typeof payload.end_date === "string" && payload.end_date ? payload.end_date : null,
      timezone: typeof payload.timezone === "string" && payload.timezone ? payload.timezone : APP_TIME_ZONE,
      publish_status: typeof payload.publish_status === "string" ? payload.publish_status : "published",
      publish_at: typeof payload.publish_at === "string" && payload.publish_at ? payload.publish_at : null,
      is_active: payload.is_active !== false,
      metadata_json: payload.metadata_json ?? null,
      updated_at: new Date().toISOString(),
    },
  };
}

export function normalizeMessagePayload(payload: Record<string, unknown>) {
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const weight = typeof payload.weight === "number" && Number.isFinite(payload.weight) ? payload.weight : 1;

  if (!title) return { error: "Title pesan wajib diisi." };
  if (!body) return { error: "Body pesan wajib diisi." };

  return {
    data: {
      title,
      body,
      weight: Math.max(1, Math.round(weight)),
      is_active: payload.is_active !== false,
    },
  };
}

export function pickWeightedMessage(messages: NotificationMessage[]) {
  const activeMessages = messages.filter((message) => message.title && message.body);
  if (!activeMessages.length) return null;

  const totalWeight = activeMessages.reduce((sum, message) => sum + Math.max(1, message.weight ?? 1), 0);
  let cursor = Math.random() * totalWeight;

  for (const message of activeMessages) {
    cursor -= Math.max(1, message.weight ?? 1);
    if (cursor <= 0) return message;
  }

  return activeMessages[0];
}

export function personalizeText(text: string, user: NotificationUser) {
  return text
    .replaceAll("{username}", user.username || "kamu")
    .replaceAll("{email}", user.email || "");
}

export async function getNotificationUsers(db: SupabaseLike) {
  const adminEmails = new Set(getAdminEmails());
  const { data, error } = await db
    .from("users")
    .select("id, username, email, phone_number, reminder_enabled, role")
    .order("username", { ascending: true });

  if (error) return { data: [] as NotificationUser[], error };

  return {
    data: (data ?? []).filter((user: NotificationUser) => {
      const role = String(user.role ?? "user").toLowerCase();
      const email = String(user.email ?? "").toLowerCase();
      return role !== "admin" && !adminEmails.has(email);
    }),
    error: null,
  };
}

export async function shouldSendToUser(db: SupabaseLike, campaign: Campaign, user: NotificationUser, today = getTodayDateString()) {
  if (user.reminder_enabled === false) return false;

  if (campaign.start_date && campaign.start_date > today) return false;
  if (campaign.end_date && campaign.end_date < today) return false;

  if (campaign.trigger_type === "always_send" || campaign.trigger_type === "manual_send") return true;

  if (campaign.trigger_type === "mood_not_filled") {
    const { data } = await db.from("moods").select("id").eq("user_id", user.id).eq("date", today).maybeSingle();
    return !data;
  }

  if (campaign.trigger_type === "quest_not_completed") {
    const { data: assignment } = await db
      .from("daily_quest_assignments")
      .select("id")
      .eq("is_active", true)
      .eq("active_date", today)
      .maybeSingle();
    if (!assignment) return false;
    const { data: completion } = await db
      .from("daily_quest_completions")
      .select("id")
      .eq("assignment_id", assignment.id)
      .eq("user_id", user.id)
      .maybeSingle();
    return !completion;
  }

  if (campaign.trigger_type === "minigame_not_played") {
    const { data: minigame } = await db
      .from("mini_games")
      .select("id")
      .eq("is_active", true)
      .or(`active_date.is.null,active_date.eq.${today}`)
      .limit(1)
      .maybeSingle();
    if (!minigame) return false;
    const { data: completion } = await db
      .from("mini_game_completions")
      .select("id")
      .eq("minigame_id", minigame.id)
      .eq("user_id", user.id)
      .maybeSingle();
    return !completion;
  }

  if (campaign.trigger_type === "event_countdown") {
    const targetDate = typeof campaign.metadata_json?.target_date === "string" ? campaign.metadata_json.target_date : null;
    const daysBefore = Number(campaign.metadata_json?.days_before ?? 0);
    if (!targetDate) return false;
    const todayMs = new Date(`${today}T00:00:00+07:00`).getTime();
    const targetMs = new Date(`${targetDate}T00:00:00+07:00`).getTime();
    return Math.round((targetMs - todayMs) / (24 * 60 * 60 * 1000)) === daysBefore;
  }

  return true;
}

export async function sendNotificationToUser(
  db: SupabaseLike,
  user: NotificationUser,
  title: string,
  body: string,
  campaignId?: string | null,
) {
  const client = getTwilioClient();
  const fromAddress = getWhatsAppFromAddress();
  const sentAt = new Date().toISOString();
  const notificationTitle = personalizeText(title, user);
  const notificationBody = personalizeText(body, user);

  try {
    if (!user.phone_number) throw new Error("User belum punya phone number.");
    if (!client || !fromAddress) throw new Error("Twilio configuration is missing.");

    const phoneNumber = formatPhoneNumber(user.phone_number);
    const message = await client.messages.create({
      from: fromAddress,
      to: `whatsapp:${phoneNumber}`,
      body: `${notificationTitle}\n\n${notificationBody}`,
    });

    const { data: log } = await db.from("notification_delivery_logs").insert({
      campaign_id: campaignId ?? null,
      user_id: user.id,
      notification_title: notificationTitle,
      notification_body: notificationBody,
      status: "sent",
      delivery_channel: "whatsapp",
      provider_message_id: message.sid,
      sent_at: sentAt,
    }).select().single();

    return { status: "sent", log };
  } catch (error) {
    const { data: log } = await db.from("notification_delivery_logs").insert({
      campaign_id: campaignId ?? null,
      user_id: user.id,
      notification_title: notificationTitle,
      notification_body: notificationBody,
      status: "failed",
      delivery_channel: "whatsapp",
      error_message: error instanceof Error ? error.message : "Unknown error",
      sent_at: sentAt,
    }).select().single();

    return { status: "failed", log, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
