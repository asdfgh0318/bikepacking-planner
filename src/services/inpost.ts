import { lineString, length, along } from '@turf/turf';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { INPOST_TIMEOUT_MS } from '../config';

export interface InPostPoint {
  name: string;
  type: string[];
  status: string;
  location: { latitude: number; longitude: number };
  address: { line1: string; line2: string };
  opening_hours: string;
  location_247: boolean;
  partner_id: number;
  location_description: string;
}

const INPOST_API = 'https://api-pl-points.easypack24.net/v1/points';

/** Target spacing of query points along the route (km). */
const QUERY_SPACING_KM = 10;
/** Upper bound on queries per route; longer routes get wider spacing. */
const MAX_QUERIES = 25;
/** The API returns at most this many points per query, nearest first. */
const QUERY_LIMIT = 500;
/** Queries in flight at once. */
const CONCURRENCY = 5;

/**
 * Where to ask InPost for lockers. `relative_point` returns only the points
 * nearest to it, capped at 500, so one query cannot cover a route. Sample
 * points along the line and pick the smallest radius whose circles still
 * cover the whole corridor between neighbouring samples.
 */
export function paczkomatQueryPlan(
  routeGeometry: GeoJSON.LineString,
  corridorWidthKm: number,
): { points: [lat: number, lng: number][]; radiusM: number } {
  const coords = routeGeometry.coordinates;
  const line = lineString(coords);
  const totalKm = length(line, { units: 'kilometers' });
  const intervals = Math.max(1, Math.min(MAX_QUERIES - 1, Math.ceil(totalKm / QUERY_SPACING_KM)));
  const spacingKm = totalKm / intervals;

  const points: [number, number][] = [];
  for (let i = 0; i <= intervals; i++) {
    const [lng, lat] = i === intervals
      ? coords[coords.length - 1]
      : along(line, i * spacingKm, { units: 'kilometers' }).geometry.coordinates;
    points.push([lat, lng]);
  }
  // Straight-line distance between neighbours is at most spacingKm.
  const radiusKm = Math.hypot(spacingKm / 2, corridorWidthKm);
  return { points, radiusM: Math.ceil(radiusKm * 1000) };
}

async function fetchNear(lat: number, lng: number, radiusM: number, signal?: AbortSignal): Promise<unknown[]> {
  const url = new URL(INPOST_API);
  url.searchParams.set('status', 'Operating');
  url.searchParams.set('type', 'parcel_locker');
  url.searchParams.set('relative_point', `${lat.toFixed(5)},${lng.toFixed(5)}`);
  url.searchParams.set('max_distance', String(radiusM));
  url.searchParams.set('limit', String(QUERY_LIMIT));
  url.searchParams.set('per_page', String(QUERY_LIMIT));

  const res = await fetchWithRetry(url.toString(), { signal, timeout: INPOST_TIMEOUT_MS });
  if (!res.ok) {
    throw new Error(`InPost API error: ${res.status}`);
  }
  const data = await res.json();
  // API returns { items: [...], count, page, ... }
  const rawItems = data?.items ?? data;
  if (!Array.isArray(rawItems)) {
    console.warn('[InPost] Unexpected response structure, expected array or { items: [] }');
    return [];
  }
  return rawItems;
}

/**
 * Lockers near the route, de-duplicated by name. The result is a superset of
 * the corridor; the caller filters to the corridor polygon. Rejects only if
 * every query failed (or on abort).
 */
export async function fetchPaczkomaty(
  routeGeometry: GeoJSON.LineString,
  corridorWidthKm: number,
  signal?: AbortSignal,
): Promise<InPostPoint[]> {
  const { points, radiusM } = paczkomatQueryPlan(routeGeometry, corridorWidthKm);

  const byName = new Map<string, InPostPoint>();
  let succeeded = 0;
  let lastError: unknown;

  for (let i = 0; i < points.length; i += CONCURRENCY) {
    const batch = await Promise.allSettled(
      points.slice(i, i + CONCURRENCY).map(([lat, lng]) => fetchNear(lat, lng, radiusM, signal)),
    );
    if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');

    for (const result of batch) {
      if (result.status === 'rejected') {
        lastError = result.reason;
        continue;
      }
      succeeded++;
      for (const raw of result.value) {
        // Skip invalid items
        const p = raw as Partial<InPostPoint> | null;
        const lat = p?.location?.latitude;
        const lng = p?.location?.longitude;
        if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) continue;
        if (typeof p?.name !== 'string' || !p.address || typeof p.address.line1 !== 'string') continue;
        if (!byName.has(p.name)) byName.set(p.name, p as InPostPoint);
      }
    }
  }

  if (succeeded === 0) throw lastError;
  return [...byName.values()];
}
