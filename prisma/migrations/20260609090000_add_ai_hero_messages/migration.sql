CREATE TABLE IF NOT EXISTS public.hero_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_rating integer NOT NULL,
  max_rating integer NOT NULL,
  title text,
  message text NOT NULL,
  tone text NOT NULL DEFAULT 'soft',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_hero_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_mood_id uuid NOT NULL REFERENCES public.moods(id) ON DELETE CASCADE,
  title text,
  summary text,
  message text NOT NULL,
  tone text NOT NULL,
  generation_source text NOT NULL,
  active_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  requires_review boolean NOT NULL DEFAULT false,
  metadata_json jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT ai_hero_messages_generation_source_check
    CHECK (generation_source IN ('ai', 'fallback', 'manual')),
  CONSTRAINT ai_hero_messages_user_active_date_unique
    UNIQUE (user_id, active_date)
);

CREATE INDEX IF NOT EXISTS ai_hero_messages_user_active_date_idx
  ON public.ai_hero_messages(user_id, active_date DESC);

CREATE INDEX IF NOT EXISTS ai_hero_messages_source_mood_idx
  ON public.ai_hero_messages(source_mood_id);

CREATE INDEX IF NOT EXISTS ai_hero_messages_requires_review_idx
  ON public.ai_hero_messages(requires_review, created_at DESC);

CREATE INDEX IF NOT EXISTS hero_message_templates_rating_idx
  ON public.hero_message_templates(min_rating, max_rating, is_active);

INSERT INTO public.hero_message_templates (min_rating, max_rating, title, message, tone)
VALUES
  (1, 3, 'Pelan dulu hari ini', 'Kemarin mungkin terasa berat. Tidak apa-apa berjalan pelan, yang penting kamu tetap ada di sini hari ini.', 'supportive'),
  (4, 6, 'Hari baru yang lebih ringan', 'Terima kasih sudah bertahan sampai hari ini. Semoga hari ini terasa sedikit lebih ringan dari kemarin.', 'calm'),
  (7, 9, 'Bawa baiknya pelan-pelan', 'Senang melihat harimu berjalan cukup baik kemarin. Semoga energi baik itu tetap menemani hari ini.', 'positive'),
  (10, 10, 'Hari baik yang manis', 'Kemarin kelihatannya menyenangkan sekali. Semoga hari ini juga punya bagian kecil yang bikin kamu tersenyum.', 'celebration')
ON CONFLICT DO NOTHING;
