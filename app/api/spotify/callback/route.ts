import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, getAuthenticatedUser } from "@/lib/server-supabase";
import { getSpotifyConfig } from "@/lib/spotify-weather";

export async function GET(req: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) return NextResponse.redirect(new URL("/login", req.url));

  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/dashboard?spotify=missing_code", req.url));

  const config = getSpotifyConfig(req);
  if (!config.clientId || !config.clientSecret) {
    return NextResponse.redirect(new URL("/dashboard?spotify=missing_env", req.url));
  }

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: config.redirectUri,
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenJson.error_description || "Spotify token exchange failed.");

    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const profile = await profileRes.json();

    const db = createServiceRoleClient();
    await db.from("spotify_accounts").upsert({
      user_id: user.id,
      spotify_user_id: profile.id ?? null,
      display_name: profile.display_name ?? profile.email ?? null,
      access_token: tokenJson.access_token,
      refresh_token: tokenJson.refresh_token,
      expires_at: new Date(Date.now() + Number(tokenJson.expires_in ?? 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return NextResponse.redirect(new URL("/dashboard?spotify=connected", req.url));
  } catch (error) {
    console.error("Spotify callback error:", error);
    return NextResponse.redirect(new URL("/dashboard?spotify=failed", req.url));
  }
}
