import { APP_TIME_ZONE } from "@/lib/app-config";

type SupabaseLike = {
  from: (table: string) => any;
};

type SpotifyAccount = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

type SpotifyImage = { url?: string };
type SpotifyTrack = {
  id?: string;
  name?: string;
  artists?: Array<{ name?: string }>;
  album?: { name?: string; images?: SpotifyImage[] };
  external_urls?: { spotify?: string };
};

export type SpotifyTrackSnapshot = {
  track_id: string | null;
  track_name: string | null;
  artist_name: string | null;
  album_name: string | null;
  album_image: string | null;
  spotify_url: string | null;
};

export type WeatherSnapshot = {
  temperature: number | null;
  weather_code: number | null;
  weather_description: string | null;
  is_day: boolean | null;
  rain_probability: number | null;
};

export function getSpotifyRedirectUri(req: Request) {
  return process.env.SPOTIFY_REDIRECT_URI || `${new URL(req.url).origin}/api/spotify/callback`;
}

export function getSpotifyConfig(req?: Request) {
  return {
    clientId: process.env.SPOTIFY_CLIENT_ID || "",
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
    redirectUri: req ? getSpotifyRedirectUri(req) : process.env.SPOTIFY_REDIRECT_URI || "",
  };
}

export function mapSpotifyTrack(track?: SpotifyTrack | null): SpotifyTrackSnapshot {
  return {
    track_id: track?.id ?? null,
    track_name: track?.name ?? null,
    artist_name: track?.artists?.map((artist) => artist.name).filter(Boolean).join(", ") || null,
    album_name: track?.album?.name ?? null,
    album_image: track?.album?.images?.[0]?.url ?? null,
    spotify_url: track?.external_urls?.spotify ?? null,
  };
}

export function getWeatherDescription(code?: number | null) {
  const descriptions: Record<number, string> = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime Fog",
    51: "Light Drizzle",
    53: "Drizzle",
    55: "Heavy Drizzle",
    61: "Light Rain",
    63: "Rain",
    65: "Heavy Rain",
    80: "Rain Showers",
    81: "Rain Showers",
    82: "Heavy Rain Showers",
    95: "Thunderstorm",
  };
  return code === null || code === undefined ? null : descriptions[code] ?? "Unknown Weather";
}

export async function refreshSpotifyToken(db: SupabaseLike, account: SpotifyAccount) {
  const config = getSpotifyConfig();
  if (!config.clientId || !config.clientSecret) throw new Error("Spotify env belum lengkap.");

  const expiresAt = new Date(account.expires_at).getTime();
  if (expiresAt > Date.now() + 60_000) return account.access_token;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || "Gagal refresh Spotify token.");

  const nextAccessToken = json.access_token;
  const nextRefreshToken = json.refresh_token ?? account.refresh_token;
  const expiresAtIso = new Date(Date.now() + Number(json.expires_in ?? 3600) * 1000).toISOString();

  await db.from("spotify_accounts").update({
    access_token: nextAccessToken,
    refresh_token: nextRefreshToken,
    expires_at: expiresAtIso,
    updated_at: new Date().toISOString(),
  }).eq("user_id", account.user_id);

  return nextAccessToken;
}

export async function getSpotifyAccount(db: SupabaseLike, userId: string) {
  return db.from("spotify_accounts").select("*").eq("user_id", userId).maybeSingle();
}

export async function fetchWeatherSnapshot(latitude?: string | null, longitude?: string | null): Promise<WeatherSnapshot> {
  const lat = latitude || process.env.NEXT_PUBLIC_WEATHER_LATITUDE || process.env.WEATHER_LATITUDE || "-6.2000";
  const lon = longitude || process.env.NEXT_PUBLIC_WEATHER_LONGITUDE || process.env.WEATHER_LONGITUDE || "106.8167";
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat);
  url.searchParams.set("longitude", lon);
  url.searchParams.set("current", "temperature_2m,weather_code,is_day,rain");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", APP_TIME_ZONE);

  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.reason || "Gagal mengambil weather snapshot.");
  const current = json.current ?? {};
  const code = typeof current.weather_code === "number" ? current.weather_code : null;

  return {
    temperature: typeof current.temperature_2m === "number" ? current.temperature_2m : null,
    weather_code: code,
    weather_description: getWeatherDescription(code),
    is_day: typeof current.is_day === "number" ? current.is_day === 1 : null,
    rain_probability: typeof current.rain === "number" ? Math.round(current.rain) : null,
  };
}
