import { NextResponse } from "next/server";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";
import { getSpotifyAccount, mapSpotifyTrack, refreshSpotifyToken } from "@/lib/spotify-weather";

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = createServiceRoleClient();
    const { data: account } = await getSpotifyAccount(db, user.id);
    if (!account) return NextResponse.json({ connected: false, tracks: [] });

    const accessToken = await refreshSpotifyToken(db, account);
    const url = new URL("https://api.spotify.com/v1/me/player/recently-played");
    url.searchParams.set("limit", "20");

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || "Gagal mengambil recently played.");

    return NextResponse.json({
      connected: true,
      tracks: (json.items ?? []).map((item: { track?: unknown; played_at?: string }) => ({
        ...mapSpotifyTrack(item.track as never),
        played_at: item.played_at,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal mengambil Spotify recently played.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
