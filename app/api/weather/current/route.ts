import { NextRequest, NextResponse } from "next/server";
import { fetchWeatherSnapshot } from "@/lib/spotify-weather";
import { getAuthenticatedUser } from "@/lib/server-supabase";

export async function GET(req: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const snapshot = await fetchWeatherSnapshot(
      req.nextUrl.searchParams.get("lat"),
      req.nextUrl.searchParams.get("lon"),
    );
    return NextResponse.json({ weather: snapshot });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal mengambil weather snapshot.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
