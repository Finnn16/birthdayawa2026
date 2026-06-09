import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-supabase";

type WeatherCodeInfo = {
  label: string;
  tone: string;
};

const WEATHER_CODES: Record<number, WeatherCodeInfo> = {
  0: { label: "Cerah", tone: "SUN" },
  1: { label: "Cerah berawan", tone: "SUN" },
  2: { label: "Sebagian berawan", tone: "CLOUD" },
  3: { label: "Berawan", tone: "CLOUD" },
  45: { label: "Berkabut", tone: "FOG" },
  48: { label: "Kabut tebal", tone: "FOG" },
  51: { label: "Gerimis ringan", tone: "RAIN" },
  53: { label: "Gerimis", tone: "RAIN" },
  55: { label: "Gerimis deras", tone: "RAIN" },
  61: { label: "Hujan ringan", tone: "RAIN" },
  63: { label: "Hujan", tone: "RAIN" },
  65: { label: "Hujan deras", tone: "RAIN" },
  80: { label: "Hujan lokal ringan", tone: "RAIN" },
  81: { label: "Hujan lokal", tone: "RAIN" },
  82: { label: "Hujan lokal deras", tone: "RAIN" },
  95: { label: "Badai petir", tone: "STORM" },
  96: { label: "Badai petir beresiko es", tone: "STORM" },
  99: { label: "Badai petir deras", tone: "STORM" },
};

function readCoordinate(primaryKey: string, fallbackKey: string) {
  const raw = process.env[primaryKey] ?? process.env[fallbackKey];
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) ? value : null;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getCodeInfo(code: unknown) {
  const numericCode = typeof code === "number" ? code : Number(code);
  return WEATHER_CODES[numericCode] ?? { label: "Cuaca terkini", tone: "SKY" };
}

function isRainCode(code: unknown) {
  const numericCode = typeof code === "number" ? code : Number(code);
  return (
    (numericCode >= 51 && numericCode <= 67) ||
    (numericCode >= 80 && numericCode <= 82) ||
    numericCode >= 95
  );
}

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const latitude = readCoordinate(
    "NEXT_PUBLIC_WEATHER_LATITUDE",
    "WEATHER_LATITUDE",
  );
  const longitude = readCoordinate(
    "NEXT_PUBLIC_WEATHER_LONGITUDE",
    "WEATHER_LONGITUDE",
  );

  if (latitude === null || longitude === null) {
    return NextResponse.json(
      { error: "WEATHER_LATITUDE dan WEATHER_LONGITUDE belum dikonfigurasi." },
      { status: 400 },
    );
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "is_day",
    ].join(","),
  );
  url.searchParams.set(
    "daily",
    [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
    ].join(","),
  );
  url.searchParams.set("timezone", "Asia/Jakarta");
  url.searchParams.set("forecast_days", "2");

  try {
    const response = await fetch(url, { next: { revalidate: 900 } });
    const payload = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            payload?.reason ??
            payload?.error ??
            "Open-Meteo belum bisa diakses.",
        },
        { status: response.status },
      );
    }

    const current = payload?.current ?? {};
    const daily = payload?.daily ?? {};
    const codeInfo = getCodeInfo(
      current.weather_code ?? daily.weather_code?.[0],
    );
    const tomorrowRainProbability = numberOrNull(
      daily.precipitation_probability_max?.[1],
    );
    const tomorrowCode = daily.weather_code?.[1];
    const tomorrowCodeInfo = getCodeInfo(tomorrowCode);
    const tomorrowWillRain =
      isRainCode(tomorrowCode) ||
      (tomorrowRainProbability !== null && tomorrowRainProbability >= 40);

    return NextResponse.json({
      weather: {
        label: codeInfo.label,
        tone: codeInfo.tone,
        temperature: numberOrNull(current.temperature_2m),
        apparentTemperature: numberOrNull(current.apparent_temperature),
        humidity: numberOrNull(current.relative_humidity_2m),
        precipitation: numberOrNull(current.precipitation),
        windSpeed: numberOrNull(current.wind_speed_10m),
        isDay: current.is_day === 1,
        daily: {
          maxTemperature: numberOrNull(daily.temperature_2m_max?.[0]),
          minTemperature: numberOrNull(daily.temperature_2m_min?.[0]),
          precipitationProbability: numberOrNull(
            daily.precipitation_probability_max?.[0],
          ),
        },
        tomorrow: {
          label: tomorrowCodeInfo.label,
          willRain: tomorrowWillRain,
          precipitationProbability: tomorrowRainProbability,
          advice: tomorrowWillRain
            ? "Besok bilih bisi hujan, bawa payung ya."
            : "Tetap bawa payung kepanasan nanti mwehehehe",
        },
        updatedAt: current.time ?? null,
      },
    });
  } catch (fetchError) {
    return NextResponse.json(
      {
        error:
          fetchError instanceof Error
            ? fetchError.message
            : "Open-Meteo belum bisa diakses.",
      },
      { status: 502 },
    );
  }
}
