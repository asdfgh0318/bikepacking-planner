import { lineString, length, along } from '@turf/turf';
import type { DayWeather, RouteWeather, WeatherCondition, DaySegment } from '../types';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import {
  WEATHER_CACHE_TTL_MS,
  WEATHER_TIMEZONE,
  WEATHER_MAX_FORECAST_DAYS,
  WEATHER_RAIN_WARNING_MM,
  WEATHER_RAIN_DANGER_MM,
  WEATHER_WIND_WARNING_KMH,
  WEATHER_WIND_DANGER_KMH,
  WEATHER_HEAT_WARNING_C,
  WEATHER_HEAT_DANGER_C,
  WEATHER_FREEZE_WARNING_C,
  WEATHER_FREEZE_DANGER_C,
  WEATHER_TIMEOUT_MS,
} from '../config';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const weatherCache = new Map<string, RouteWeather>();

function buildCacheKey(coord: [number, number], tripStartDate: string): string {
  const lng = coord[0].toFixed(2);
  const lat = coord[1].toFixed(2);
  return `${lng},${lat}|${tripStartDate}`;
}

function getCachedWeather(coord: [number, number], tripStartDate: string): RouteWeather | null {
  const key = buildCacheKey(coord, tripStartDate);
  const entry = weatherCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt >= WEATHER_CACHE_TTL_MS) {
    weatherCache.delete(key);
    return null;
  }
  return entry;
}

function setCachedWeather(coord: [number, number], tripStartDate: string, data: RouteWeather): void {
  const key = buildCacheKey(coord, tripStartDate);
  weatherCache.set(key, data);
}

/**
 * Map WMO weather codes to our simplified conditions.
 * See: https://open-meteo.com/en/docs (WMO Weather interpretation codes)
 */
function wmoToCondition(code: number): WeatherCondition {
  if (code === 0) return 'clear';
  if (code <= 3) return 'partly_cloudy';
  if (code <= 49) return 'fog';
  if (code <= 59) return 'drizzle';
  if (code <= 69) return 'rain';
  if (code <= 79) return 'snow';
  if (code <= 82) return 'heavy_rain';
  if (code <= 86) return 'snow';
  if (code >= 95) return 'thunderstorm';
  return 'cloudy';
}

/**
 * Get a weather emoji for display.
 */
export function weatherEmoji(condition: WeatherCondition): string {
  switch (condition) {
    case 'clear': return '☀️';
    case 'partly_cloudy': return '⛅';
    case 'cloudy': return '☁️';
    case 'fog': return '🌫️';
    case 'drizzle': return '🌦️';
    case 'rain': return '🌧️';
    case 'heavy_rain': return '⛈️';
    case 'snow': return '🌨️';
    case 'thunderstorm': return '⛈️';
    default: return '🌤️';
  }
}

/**
 * Get the midpoint of the route for weather sampling.
 * For routes <200km a single point is sufficient since weather
 * doesn't vary much over that distance.
 */
function getRouteMidpoint(routeGeometry: GeoJSON.LineString): [number, number] {
  const line = lineString(routeGeometry.coordinates);
  const totalKm = length(line, { units: 'kilometers' });
  const mid = along(line, totalKm / 2, { units: 'kilometers' });
  return mid.geometry.coordinates as [number, number];
}

/**
 * Fetch weather forecast from Open-Meteo for a given coordinate.
 * Returns daily forecasts for the next 7 days.
 */
async function fetchOpenMeteo(
  lat: number,
  lng: number,
  forecastDays: number,
  signal?: AbortSignal
): Promise<{
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    wind_direction_10m_dominant: number[];
    weather_code: number[];
  };
}> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_direction_10m_dominant',
      'weather_code',
    ].join(','),
    timezone: WEATHER_TIMEZONE,
    forecast_days: String(Math.min(forecastDays, WEATHER_MAX_FORECAST_DAYS)),
  });

  const res = await fetchWithRetry(`${OPEN_METEO_URL}?${params}`, { signal, timeout: WEATHER_TIMEOUT_MS });
  if (!res.ok) {
    throw new Error(`Open-Meteo error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch weather for a bikepacking route.
 * Uses the route midpoint and trip start date to get day-aligned forecasts.
 */
export async function fetchRouteWeather(
  routeGeometry: GeoJSON.LineString,
  daySegments: DaySegment[],
  tripStartDate: string,
  signal?: AbortSignal
): Promise<RouteWeather> {
  const [lng, lat] = getRouteMidpoint(routeGeometry);

  // Check cache — keyed by rounded coordinate + trip date
  const cached = getCachedWeather([lng, lat], tripStartDate);
  if (cached) {
    return cached;
  }
  const numDays = daySegments.length;

  // Check how far in the future the trip is (use noon to avoid timezone day-shift)
  const startDate = new Date(tripStartDate + 'T12:00:00');
  const now = new Date();
  const daysUntilStart = Math.round((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Open-Meteo only forecasts up to WEATHER_MAX_FORECAST_DAYS days ahead
  if (daysUntilStart > WEATHER_MAX_FORECAST_DAYS) {
    return {
      days: daySegments.map((seg) => ({
        dayNumber: seg.dayNumber,
        date: addDays(tripStartDate, seg.dayNumber - 1),
        tempMin: 0,
        tempMax: 0,
        precipitationSum: 0,
        precipitationProbMax: 0,
        windSpeedMax: 0,
        windDirection: 0,
        condition: 'clear' as WeatherCondition,
        weatherCode: -1, // -1 means "no forecast available"
      })),
      fetchedAt: Date.now(),
      sampleCoord: [lng, lat],
      forecastAvailable: false,
    };
  }

  const forecastDays = Math.min(Math.max(daysUntilStart + numDays, 1), WEATHER_MAX_FORECAST_DAYS);
  const data = await fetchOpenMeteo(lat, lng, forecastDays, signal);

  // Map API dates to trip days
  const days: DayWeather[] = [];
  for (const seg of daySegments) {
    const date = addDays(tripStartDate, seg.dayNumber - 1);
    const idx = data.daily.time.indexOf(date);

    if (idx >= 0) {
      const code = data.daily.weather_code[idx];
      days.push({
        dayNumber: seg.dayNumber,
        date,
        tempMin: data.daily.temperature_2m_min[idx],
        tempMax: data.daily.temperature_2m_max[idx],
        precipitationSum: data.daily.precipitation_sum[idx],
        precipitationProbMax: data.daily.precipitation_probability_max[idx],
        windSpeedMax: data.daily.wind_speed_10m_max[idx],
        windDirection: data.daily.wind_direction_10m_dominant[idx],
        condition: wmoToCondition(code),
        weatherCode: code,
      });
    } else {
      // Date not in forecast range
      days.push({
        dayNumber: seg.dayNumber,
        date,
        tempMin: 0,
        tempMax: 0,
        precipitationSum: 0,
        precipitationProbMax: 0,
        windSpeedMax: 0,
        windDirection: 0,
        condition: 'clear',
        weatherCode: -1,
      });
    }
  }

  const result: RouteWeather = {
    days,
    fetchedAt: Date.now(),
    sampleCoord: [lng, lat],
    forecastAvailable: true,
  };

  setCachedWeather([lng, lat], tripStartDate, result);
  return result;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00'); // noon to avoid timezone day-shift
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Generate weather-based warnings for the resupply plan.
 */
export function getWeatherWarnings(days: DayWeather[]): { dayNumber: number; message: string; severity: 'info' | 'warning' | 'danger' }[] {
  const warnings: { dayNumber: number; message: string; severity: 'info' | 'warning' | 'danger' }[] = [];

  for (const day of days) {
    if (day.weatherCode === -1) continue; // no data

    // Heavy rain
    if (day.precipitationSum > WEATHER_RAIN_WARNING_MM) {
      warnings.push({
        dayNumber: day.dayNumber,
        message: `Day ${day.dayNumber}: Heavy rain expected (${day.precipitationSum.toFixed(0)}mm). Pack rain gear, expect slower progress.`,
        severity: day.precipitationSum > WEATHER_RAIN_DANGER_MM ? 'danger' : 'warning',
      });
    }

    // Strong wind
    if (day.windSpeedMax > WEATHER_WIND_WARNING_KMH) {
      warnings.push({
        dayNumber: day.dayNumber,
        message: `Day ${day.dayNumber}: Strong wind ${day.windSpeedMax.toFixed(0)} km/h. Reduce daily target.`,
        severity: day.windSpeedMax > WEATHER_WIND_DANGER_KMH ? 'danger' : 'warning',
      });
    }

    // Extreme heat
    if (day.tempMax > WEATHER_HEAT_WARNING_C) {
      warnings.push({
        dayNumber: day.dayNumber,
        message: `Day ${day.dayNumber}: Heat warning ${day.tempMax.toFixed(0)}°C. Carry extra water, start early.`,
        severity: day.tempMax > WEATHER_HEAT_DANGER_C ? 'danger' : 'warning',
      });
    }

    // Freezing
    if (day.tempMin < WEATHER_FREEZE_WARNING_C) {
      warnings.push({
        dayNumber: day.dayNumber,
        message: `Day ${day.dayNumber}: Freezing temperatures (${day.tempMin.toFixed(0)}°C). Risk of ice on roads.`,
        severity: day.tempMin < WEATHER_FREEZE_DANGER_C ? 'danger' : 'warning',
      });
    }

    // Thunderstorm
    if (day.condition === 'thunderstorm') {
      warnings.push({
        dayNumber: day.dayNumber,
        message: `Day ${day.dayNumber}: Thunderstorms forecast. Seek shelter, avoid exposed ridges.`,
        severity: 'danger',
      });
    }
  }

  return warnings;
}
