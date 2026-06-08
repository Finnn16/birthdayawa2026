CREATE TABLE IF NOT EXISTS public.notification_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  notification_type text NOT NULL,
  trigger_type text NOT NULL,
  send_time text NOT NULL,
  start_date date,
  end_date date,
  timezone text NOT NULL DEFAULT 'Asia/Jakarta',
  publish_status text NOT NULL DEFAULT 'published',
  publish_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  metadata_json jsonb,
  last_sent_at timestamptz,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.notification_campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  weight integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.notification_campaigns(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  notification_title text NOT NULL,
  notification_body text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  delivery_channel text NOT NULL DEFAULT 'whatsapp',
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_campaigns_active_trigger_time_idx
  ON public.notification_campaigns(is_active, trigger_type, send_time);

CREATE INDEX IF NOT EXISTS notification_campaigns_publish_idx
  ON public.notification_campaigns(publish_status, publish_at);

CREATE INDEX IF NOT EXISTS notification_messages_campaign_active_idx
  ON public.notification_messages(campaign_id, is_active);

CREATE INDEX IF NOT EXISTS notification_delivery_logs_campaign_created_idx
  ON public.notification_delivery_logs(campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notification_delivery_logs_user_created_idx
  ON public.notification_delivery_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notification_delivery_logs_status_created_idx
  ON public.notification_delivery_logs(status, created_at DESC);
