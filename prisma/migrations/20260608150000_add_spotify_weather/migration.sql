CREATE TABLE IF NOT EXISTS public.spotify_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  spotify_user_id text,
  display_name text,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.spotify_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  track_id text,
  track_name text,
  artist_name text,
  album_name text,
  album_image text,
  spotify_url text,
  is_playing boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.moods
  ADD COLUMN IF NOT EXISTS spotify_track_id text,
  ADD COLUMN IF NOT EXISTS song_title text,
  ADD COLUMN IF NOT EXISTS artist_name text,
  ADD COLUMN IF NOT EXISTS album_name text,
  ADD COLUMN IF NOT EXISTS album_image text,
  ADD COLUMN IF NOT EXISTS weather_temperature numeric(5, 2),
  ADD COLUMN IF NOT EXISTS weather_code integer,
  ADD COLUMN IF NOT EXISTS weather_description text,
  ADD COLUMN IF NOT EXISTS weather_is_day boolean,
  ADD COLUMN IF NOT EXISTS weather_rain_probability integer;

CREATE INDEX IF NOT EXISTS spotify_presence_playing_synced_idx
  ON public.spotify_presence(is_playing, last_synced_at);

CREATE INDEX IF NOT EXISTS moods_spotify_track_idx
  ON public.moods(spotify_track_id);

CREATE INDEX IF NOT EXISTS moods_weather_code_idx
  ON public.moods(weather_code);
