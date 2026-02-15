import { fetchWithRetry } from '../utils/fetchWithRetry';
import {
  OVERPASS_TIMEOUT_MS,
  OVERPASS_QUERY_TIMEOUT_S,
  OVERPASS_ENDPOINTS,
} from '../config';
import { classifyElements, type OverpassElement } from './poiClassifier';
import { debugLog } from '../utils/debugLogger';
import type { SupplyPoint } from '../types';

// ---------------------------------------------------------------------------
// Query builders
// ---------------------------------------------------------------------------

/**
 * Build a single Overpass QL union query covering ALL supply POI types.
 * Uses the `around` filter with a downsampled route polyline.
 */
export function buildUnifiedSupplyQuery(polyline: string, radiusM: number): string {
  return `[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_S}];
(
  // Shops - branded
  node["brand:wikidata"="Q2874810"](around:${radiusM},${polyline});
  node["brand:wikidata"="Q857855"](around:${radiusM},${polyline});
  // Shops - generic
  node["shop"="supermarket"](around:${radiusM},${polyline});
  way["shop"="supermarket"](around:${radiusM},${polyline});
  node["shop"="convenience"](around:${radiusM},${polyline});
  node["shop"="bakery"](around:${radiusM},${polyline});
  // Food service
  node["amenity"="cafe"](around:${radiusM},${polyline});
  node["amenity"="restaurant"](around:${radiusM},${polyline});
  node["amenity"="fuel"](around:${radiusM},${polyline});
  way["amenity"="fuel"](around:${radiusM},${polyline});
  // Water
  node["natural"="spring"](around:${radiusM},${polyline});
  node["amenity"="drinking_water"](around:${radiusM},${polyline});
  node["amenity"="fountain"]["drinking_water"="yes"](around:${radiusM},${polyline});
  node["man_made"="water_tap"](around:${radiusM},${polyline});
  node["amenity"="water_point"](around:${radiusM},${polyline});
  node["man_made"="water_well"]["drinking_water"="yes"](around:${radiusM},${polyline});
  // Camping
  node["tourism"="camp_site"](around:${radiusM},${polyline});
  way["tourism"="camp_site"](around:${radiusM},${polyline});
  node["tourism"="wilderness_hut"](around:${radiusM},${polyline});
  way["tourism"="wilderness_hut"](around:${radiusM},${polyline});
  node["tourism"="alpine_hut"](around:${radiusM},${polyline});
  node["amenity"="shelter"](around:${radiusM},${polyline});
  way["amenity"="shelter"](around:${radiusM},${polyline});
  node["camp_site"="bivouac"](around:${radiusM},${polyline});
  // Repair
  node["shop"="bicycle"](around:${radiusM},${polyline});
  way["shop"="bicycle"](around:${radiusM},${polyline});
  node["amenity"="bicycle_repair_station"](around:${radiusM},${polyline});
  node["amenity"="compressed_air"](around:${radiusM},${polyline});
  // Medical/hygiene
  node["amenity"="pharmacy"](around:${radiusM},${polyline});
  node["amenity"="toilets"](around:${radiusM},${polyline});
);
out center;`;
}

/**
 * Build an Overpass QL query for bail-out points (train stations, halts, hospitals).
 * Typically called with a wider radius than supply queries.
 */
export function buildBailOutQuery(polyline: string, radiusM: number): string {
  return `[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_S}];
(
  node["railway"="station"]["name"](around:${radiusM},${polyline});
  node["railway"="halt"]["name"](around:${radiusM},${polyline});
  node["amenity"="hospital"]["name"](around:${radiusM},${polyline});
  way["amenity"="hospital"]["name"](around:${radiusM},${polyline});
);
out center;`;
}

// ---------------------------------------------------------------------------
// Endpoint failover
// ---------------------------------------------------------------------------

/**
 * Execute an Overpass QL query, trying each endpoint in order.
 * Uses fetchWithRetry for per-endpoint retries. On caller abort, throws immediately.
 */
export async function queryOverpassWithFailover(
  query: string,
  signal?: AbortSignal,
): Promise<OverpassElement[]> {
  let lastError: unknown;

  for (let i = 0; i < OVERPASS_ENDPOINTS.length; i++) {
    const endpoint = OVERPASS_ENDPOINTS[i];

    // If the caller already aborted, bail out immediately
    if (signal?.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }

    try {
      debugLog.debug('overpass', 'query:attempt', { endpoint, endpointIndex: i });

      const res = await fetchWithRetry(endpoint, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal,
        timeout: OVERPASS_TIMEOUT_MS,
      });

      if (!res.ok) {
        throw new Error(`Overpass error: ${res.status}`);
      }

      const data = await res.json();
      const elements: OverpassElement[] = data?.elements ?? [];

      debugLog.info('overpass', 'query:success', {
        endpoint,
        elementCount: elements.length,
      });

      return elements;
    } catch (err) {
      // On caller abort, throw immediately — do not try next endpoint
      if (signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }

      lastError = err;
      debugLog.warn('overpass', 'query:endpoint-failed', {
        endpoint,
        error: err instanceof Error ? err.message : String(err),
        willRetryNext: i < OVERPASS_ENDPOINTS.length - 1,
      });
    }
  }

  // All endpoints exhausted
  debugLog.error('overpass', 'query:all-endpoints-failed', {
    endpointCount: OVERPASS_ENDPOINTS.length,
    lastError: lastError instanceof Error ? lastError.message : String(lastError),
  });
  throw lastError;
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

/**
 * Fetch all supply POIs along a route polyline.
 * Builds a unified query, runs it with failover, and classifies results via poiClassifier.
 *
 * @param polyline    Overpass-formatted polyline string ("lat1,lon1,lat2,lon2,...")
 * @param corridorWidthKm  Corridor half-width in km (converted to metres for the query)
 * @param signal      Optional AbortSignal for cancellation
 */
export async function fetchSupplyPOIs(
  polyline: string,
  corridorWidthKm: number,
  signal?: AbortSignal,
): Promise<Omit<SupplyPoint, 'distanceFromStartKm'>[]> {
  const radiusM = Math.round(corridorWidthKm * 1000);
  const query = buildUnifiedSupplyQuery(polyline, radiusM);

  debugLog.info('overpass', 'fetchSupplyPOIs:start', { radiusM, polylineLength: polyline.length });

  const elements = await queryOverpassWithFailover(query, signal);
  const classified = classifyElements(elements);

  debugLog.info('overpass', 'fetchSupplyPOIs:done', {
    rawElements: elements.length,
    classified: classified.length,
  });

  return classified;
}

/**
 * Fetch bail-out POIs (train stations, halts, hospitals) along a route polyline.
 * Uses a wider radius: corridorWidthKm + 5 km.
 *
 * @param polyline    Overpass-formatted polyline string
 * @param corridorWidthKm  Base corridor half-width in km (5 km is added automatically)
 * @param signal      Optional AbortSignal for cancellation
 */
export async function fetchBailOutPOIs(
  polyline: string,
  corridorWidthKm: number,
  signal?: AbortSignal,
): Promise<Omit<SupplyPoint, 'distanceFromStartKm'>[]> {
  const radiusM = Math.round((corridorWidthKm + 5) * 1000);
  const query = buildBailOutQuery(polyline, radiusM);

  debugLog.info('overpass', 'fetchBailOutPOIs:start', { radiusM, polylineLength: polyline.length });

  const elements = await queryOverpassWithFailover(query, signal);
  const classified = classifyElements(elements);

  debugLog.info('overpass', 'fetchBailOutPOIs:done', {
    rawElements: elements.length,
    classified: classified.length,
  });

  return classified;
}
