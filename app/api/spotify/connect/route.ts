import { NextRequest, NextResponse } from "next/server";
import { getSpotifyConfig } from "@/lib/spotify-weather";
import { getAuthenticatedUser } from "@/lib/server-supabase";

const SPOTIFY_SCOPES = [
  "user-read-currently-playing",
  "user-read-recently-played",
].join(" ");

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = getSpotifyConfig(req);
  if (!config.clientId || !config.clientSecret) {
    return NextResponse.json({ error: "Spotify env belum lengkap." }, { status: 500 });
  }

  const state = Buffer.from(JSON.stringify({ userId: user.id, ts: Date.now() })).toString("base64url");
  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("scope", SPOTIFY_SCOPES);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);

  return NextResponse.json({ authUrl: url.toString() });
}
