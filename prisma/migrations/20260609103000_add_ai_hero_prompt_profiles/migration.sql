CREATE TABLE IF NOT EXISTS public.ai_hero_prompt_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  system_instruction text NOT NULL,
  user_prompt_template text NOT NULL,
  language text NOT NULL DEFAULT 'id-ID',
  style_guide text,
  forbidden_style text,
  max_sentences integer NOT NULL DEFAULT 2,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_hero_messages
  ADD COLUMN IF NOT EXISTS prompt_profile_id uuid REFERENCES public.ai_hero_prompt_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prompt_profile_name text;

CREATE UNIQUE INDEX IF NOT EXISTS ai_hero_prompt_profiles_one_active_idx
  ON public.ai_hero_prompt_profiles(is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS ai_hero_prompt_profiles_updated_idx
  ON public.ai_hero_prompt_profiles(updated_at DESC);

CREATE INDEX IF NOT EXISTS ai_hero_messages_prompt_profile_idx
  ON public.ai_hero_messages(prompt_profile_id);

INSERT INTO public.ai_hero_prompt_profiles (
  name,
  system_instruction,
  user_prompt_template,
  language,
  style_guide,
  forbidden_style,
  max_sentences,
  is_active
)
SELECT
  'Default Romantic Morning',
  'Kamu menulis hero message personal untuk aplikasi mood tracker romantis. Tulis singkat, hangat, natural, dan aman. Balas hanya JSON valid dengan field title, summary, message, tone.',
  'Buat Hero Message pendek maksimal {{max_sentences}} kalimat.

Gunakan bahasa {{language}} yang hangat dan natural.
Jangan terdengar seperti motivator.
Jangan terlalu formal.
Jangan terlalu berlebihan.

Style guide:
{{style_guide}}

Hindari gaya:
{{forbidden_style}}

Berdasarkan:
User: {{user_name}}
Mood Date: {{mood_date}}
Mood Rating: {{mood_rating}}
Mood Note:
{{mood_note}}

Tone hint: {{tone_hint}}

Output harus JSON valid:
{
  "title": "judul pendek",
  "summary": "ringkasan konteks singkat",
  "message": "isi hero message",
  "tone": "tone"
}',
  'id-ID',
  'Romantis lembut, personal, seperti pesan kecil pagi hari. Boleh memakai sapaan natural, tapi jangan berlebihan.',
  'Ceramah motivasi, terlalu formal, terlalu dramatis, toxic positivity, janji berlebihan.',
  2,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_hero_prompt_profiles WHERE is_active = true
);
