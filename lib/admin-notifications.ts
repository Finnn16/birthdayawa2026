import twilio from "twilio";
import { APP_TIME_ZONE } from "@/lib/app-config";
import { createServiceRoleClient } from "@/lib/server-supabase";
import { formatPhoneNumber } from "@/lib/twilioUtils";

export const NOTIFICATION_TYPES = [
  "mood_reminder",
  "minigame_reminder",
  "quest_reminder",
  "hero_message",
  "manual_broadcast",
] as const;

export const NOTIFICATION_TRIGGERS = [
  "daily",
  "mood_missing",
  "minigame_missing",
  "manual_broadcast",
] as const;

export type NotificationCampaign = {
  id: string;
  name: string;
  notification_type: string;
  trigger_type: string;
  send_time: string;
  start_date?: string | null;
  end_date?: string | null;
  timezone?: string | null;
  publish_status?: string | null;
  publish_at?: string | null;
  is_active: boolean;
  metadata_json?: Record<string, unknown> | null;
  last_sent_at?: string | null;
};

export type NotificationMessage = {
  id: string;
  campaign_id: string;
  title: string;
  body: string;
  weight: number;
  is_active: boolean;
};

export type NotificationUser = {
  id: string;
  username: string;
  email?: string | null;
  phone_number?: string | null;
  reminder_enabled?: boolean | null;
};

let twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
  twilioClient ??= twilio(accountSid, authToken);
  return twilioClient;
}

function getWhatsAppAddress(value?: string | null) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("whatsapp:") ? trimmed : `whatsapp:${formatPhoneNumber(trimmed)}`;
}

export function getWhatsAppFromAddress() {
  return getWhatsAppAddress(process.env.TWILIO_WHATSAPP_FROM ?? process.env.TWILIO_PHONE_NUMBER);
}

export function normalizeCampaignPayload(payload: Record<string, unknown>) {
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const notificationType =
    typeof payload.notification_type === "string" && NOTIFICATION_TYPES.includes(payload.notification_type as (typeof NOTIFICATION_TYPES)[number])
      ? payload.notification_type
      : "manual_broadcast";
  const triggerType =
    typeof payload.trigger_type === "string" && NOTIFICATION_TRIGGERS.includes(payload.trigger_type as (typeof NOTIFICATION_TRIGGERS)[number])
      ? payload.trigger_type
      : "manual_broadcast";
  const sendTime = typeof payload.send_time === "string" && payload.send_time ? payload.send_time : "09:00";

  if (!name) throw new Error("Campaign name wajib diisi.");

  return {
    name,
    notification_type: notificationType,
    trigger_type: triggerType,
    send_time: sendTime,
    start_date: typeof payload.start_date === "string" && payload.start_date ? payload.start_date : null,
    end_date: typeof payload.end_date === "string" && payload.end_date ? payload.end_date : null,
    timezone: typeof payload.timezone === "string" && payload.timezone ? payload.timezone : APP_TIME_ZONE,
    publish_status: typeof payload.publish_status === "string" ? payload.publish_status : "published",
    publish_at: typeof payload.publish_at === "string" && payload.publish_at ? payload.publish_at : null,
    is_active: typeof payload.is_active === "boolean" ? payload.is_active : true,
    metadata_json: payload.metadata_json && typeof payload.metadata_json === "object" ? payload.metadata_json : null,
    updated_at: new Date().toISOString(),
  };
}

export function normalizeMessagePayload(payload: Record<string, unknown>) {
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const weight = typeof payload.weight === "number" && payload.weight > 0 ? Math.floor(payload.weight) : 1;

  if (!title) throw new Error("Message title wajib diisi.");
  if (!body) throw new Error("Message body wajib diisi.");

  return {
    title,
    body,
    weight,
    is_active: typeof payload.is_active === "boolean" ? payload.is_active : true,
  };
}

export function pickWeightedMessage(messages: NotificationMessage[]) {
  const activeMessages = messages.filter((message) => message.is_active);
  if (!activeMessages.length) return null;

  const totalWeight = activeMessages.reduce((sum, message) => sum + Math.max(1, message.weight), 0);
  let cursor = Math.random() * totalWeight;
  for (const message of activeMessages) {
    cursor -= Math.max(1, message.weight);
    if (cursor <= 0) return message;
  }

  return activeMessages[0];
}

export function personalizeText(text: string, user: NotificationUser) {
  return text
    .replace(/\{\{\s*username\s*\}\}/gi, user.username || "Awa")
    .replace(/\{\{\s*email\s*\}\}/gi, user.email ?? "");
}

export function getLocalDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getLocalHourMinute(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function shouldRunCampaign(campaign: NotificationCampaign, now = new Date()) {
  if (!campaign.is_active) return false;
  if ((campaign.publish_status ?? "published") !== "published") return false;

  const today = getLocalDateString(now);
  if (campaign.start_date && campaign.start_date > today) return false;
  if (campaign.end_date && campaign.end_date < today) return false;
  if (campaign.last_sent_at?.slice(0, 10) === today) return false;

  return campaign.trigger_type === "manual_broadcast" || campaign.send_time <= getLocalHourMinute(now);
}

export async function getNotificationUsers() {
  const db = createServiceRoleClient();
  const { data: profiles, error: profileError } = await db
    .from("users")
    .select("id, username, email, phone_number, reminder_enabled")
    .order("created_at", { ascending: true });

  if (profileError) throw profileError;
  return (profiles ?? []) as NotificationUser[];
}

export async function shouldSendToUser(campaign: NotificationCampaign, user: NotificationUser) {
  if (user.reminder_enabled === false || !user.phone_number) return false;
  if (campaign.trigger_type === "daily" || campaign.trigger_type === "manual_broadcast") return true;

  const db = createServiceRoleClient();
  const today = getLocalDateString();

  if (campaign.trigger_type === "mood_missing") {
    const { data, error } = await db
      .from("moods")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();
    if (error) throw error;
    return !data;
  }

  if (campaign.trigger_type === "minigame_missing") {
    const { data: activeGame, error: gameError } = await db
      .from("mini_games")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (gameError) throw gameError;
    if (!activeGame) return false;

    const { data: completion, error: completionError } = await db
      .from("mini_game_completions")
      .select("id")
      .eq("user_id", user.id)
      .eq("minigame_id", activeGame.id)
      .maybeSingle();
    if (completionError) throw completionError;
    return !completion;
  }

  return true;
}

export async function sendNotificationToUser(params: {
  campaign: NotificationCampaign;
  message: NotificationMessage;
  user: NotificationUser;
}) {
  const db = createServiceRoleClient();
  const from = getWhatsAppFromAddress();
  const to = getWhatsAppAddress(params.user.phone_number);
  const title = personalizeText(params.message.title, params.user);
  const body = personalizeText(params.message.body, params.user);

  try {
    const client = getTwilioClient();
    if (!client || !from || !to) {
      throw new Error("Twilio WhatsApp config belum lengkap.");
    }

    const sent = await client.messages.create({
      from,
      to,
      body: `${title}\n\n${body}`,
    });

    await db.from("notification_delivery_logs").insert({
      campaign_id: params.campaign.id,
      user_id: params.user.id,
      notification_title: title,
      notification_body: body,
      status: "sent",
      delivery_channel: "whatsapp",
      provider_message_id: sent.sid,
      sent_at: new Date().toISOString(),
    });

    return { ok: true, providerMessageId: sent.sid };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db.from("notification_delivery_logs").insert({
      campaign_id: params.campaign.id,
      user_id: params.user.id,
      notification_title: title,
      notification_body: body,
      status: "failed",
      delivery_channel: "whatsapp",
      error_message: message,
    });
    return { ok: false, error: message };
  }
}
