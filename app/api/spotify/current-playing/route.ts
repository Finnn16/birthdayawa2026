import { NextResponse } from "next/server";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";
import { getSpotifyAccount, mapSpotifyTrack, refreshSpotifyToken } from "@/lib/spotify-weather";

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = createServiceRoleClient();
    const { data: account } = await getSpotifyAccount(db, user.id);
    if (!account) return NextResponse.json({ connected: false, presence: null });

    const accessToken = await refreshSpotifyToken(db, account);
    const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 204) {
      const presence = {
        user_id: user.id,
        is_playing: false,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.from("spotify_presence").upsert(presence, { onConflict: "user_id" });
      return NextResponse.json({ connected: true, presence });
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || "Gagal mengambil current playing.");

    const track = mapSpotifyTrack(json.item);
    const presence = {
      user_id: user.id,
      ...track,
      is_playing: Boolean(json.is_playing),
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await db.from("spotify_presence").upsert(presence, { onConflict: "user_id" });

    return NextResponse.json({ connected: true, presence });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal mengambil Spotify current playing.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
