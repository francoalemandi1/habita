/**
 * Weather service using Open-Meteo API (free, no API key).
 * Provides forecast data for regional context in AI prompts.
 */

interface DailyForecast {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationProbability: number;
  weatherDescription: string;
}

export interface WeatherForecast {
  today: DailyForecast;
  tomorrow: DailyForecast;
}

interface OpenMeteoResponse {
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    weathercode?: number[];
  };
}

// In-memory cache: coordinates (rounded to 1 decimal) → forecast
interface WeatherCacheEntry {
  data: WeatherForecast;
  expiresAt: number;
}

const weatherCache = new Map<string, WeatherCacheEntry>();
const WEATHER_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(1)}:${longitude.toFixed(1)}`;
}

/**
 * Fetch 2-day weather forecast from Open-Meteo.
 * Returns null if coordinates are missing or the API call fails.
 * Results are cached in-memory for 1 hour.
 */
export async function getWeatherForecast(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): Promise<WeatherForecast | null> {
  if (latitude == null || longitude == null || (latitude === 0 && longitude === 0)) {
    return null;
  }

  const key = cacheKey(latitude, longitude);
  const cached = weatherCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto&forecast_days=2`;

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as OpenMeteoResponse;
    const daily = data.daily;

    if (!daily?.time?.[0] || !daily?.time?.[1]) {
      return null;
    }

    const forecast: WeatherForecast = {
      today: {
        date: daily.time[0],
        temperatureMax: daily.temperature_2m_max?.[0] ?? 0,
        temperatureMin: daily.temperature_2m_min?.[0] ?? 0,
        precipitationProbability: daily.precipitation_probability_max?.[0] ?? 0,
        weatherDescription: weatherCodeToDescription(daily.weathercode?.[0] ?? 0),
      },
      tomorrow: {
        date: daily.time[1],
        temperatureMax: daily.temperature_2m_max?.[1] ?? 0,
        temperatureMin: daily.temperature_2m_min?.[1] ?? 0,
        precipitationProbability: daily.precipitation_probability_max?.[1] ?? 0,
        weatherDescription: weatherCodeToDescription(daily.weathercode?.[1] ?? 0),
      },
    };

    weatherCache.set(key, { data: forecast, expiresAt: Date.now() + WEATHER_CACHE_TTL_MS });
    return forecast;
  } catch {
    return null;
  }
}

/**
 * Translate WMO weather codes to human-readable Spanish descriptions.
 * Reference: https://open-meteo.com/en/docs (WMO Weather interpretation codes)
 */
function weatherCodeToDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: "despejado",
    1: "mayormente despejado",
    2: "parcialmente nublado",
    3: "nublado",
    45: "niebla",
    48: "niebla con escarcha",
    51: "llovizna ligera",
    53: "llovizna moderada",
    55: "llovizna intensa",
    56: "llovizna helada ligera",
    57: "llovizna helada intensa",
    61: "lluvia ligera",
    63: "lluvia moderada",
    65: "lluvia intensa",
    66: "lluvia helada ligera",
    67: "lluvia helada intensa",
    71: "nevada ligera",
    73: "nevada moderada",
    75: "nevada intensa",
    77: "granizo fino",
    80: "chubascos ligeros",
    81: "chubascos moderados",
    82: "chubascos intensos",
    85: "chubascos de nieve ligeros",
    86: "chubascos de nieve intensos",
    95: "tormenta eléctrica",
    96: "tormenta con granizo ligero",
    99: "tormenta con granizo intenso",
  };

  return descriptions[code] ?? "variable";
}
