import { getFreshCachedPOIs, cachePOIs, evictStaleCache } from './poiCache';
import { fetchSupplyPOIs, fetchBailOutPOIs } from './overpass';
import { downsampleRouteForOverpass, routeHash } from '../utils/routeDownsampler';
import { getDistanceAlongRoute } from '../utils/geo';
import { debugLog } from '../utils/debugLogger';
import type { SupplyPoint } from '../types';

type Fetcher = (polyline: string, corridorWidthKm: number, signal?: AbortSignal) => Promise<Omit<SupplyPoint, 'distanceFromStartKm'>[]>;

async function getOrFetch(
  routeGeometry: GeoJSON.LineString,
  hash: string,
  corridorWidthKm: number,
  fetcher: Fetcher,
  signal?: AbortSignal,
): Promise<SupplyPoint[]> {
  const cached = await getFreshCachedPOIs(hash, corridorWidthKm, 'overpass').catch(() => null);
  if (cached && cached.length > 0) {
    debugLog.info('cache', 'hit', { count: cached.length, hash: hash.slice(0, 8) });
    return cached;
  }

  debugLog.info('cache', 'miss', { hash: hash.slice(0, 8) });
  const polyline = downsampleRouteForOverpass(routeGeometry);
  const raw = await fetcher(polyline, corridorWidthKm, signal);

  const pois: SupplyPoint[] = raw.map((poi) => ({
    ...poi,
    distanceFromStartKm: getDistanceAlongRoute(routeGeometry, poi.lat, poi.lng),
  }));
  pois.sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);

  // Fire and forget — the cache must never block or fail the plan.
  cachePOIs(hash, corridorWidthKm, pois, 'overpass').catch(() => {});
  evictStaleCache().catch(() => {});

  return pois;
}

/** Supply POIs (shops, water, campsites…) — cached for 7 days per route + corridor. */
export function getOrFetchSupplyPOIs(
  routeGeometry: GeoJSON.LineString,
  corridorWidthKm: number,
  signal?: AbortSignal,
): Promise<SupplyPoint[]> {
  return getOrFetch(routeGeometry, routeHash(routeGeometry), corridorWidthKm, fetchSupplyPOIs, signal);
}

/** Bail-out POIs (stations, hospitals) — same cache, distinct key. */
export function getOrFetchBailOutPOIs(
  routeGeometry: GeoJSON.LineString,
  corridorWidthKm: number,
  signal?: AbortSignal,
): Promise<SupplyPoint[]> {
  return getOrFetch(routeGeometry, routeHash(routeGeometry) + '_bailout', corridorWidthKm, fetchBailOutPOIs, signal);
}
