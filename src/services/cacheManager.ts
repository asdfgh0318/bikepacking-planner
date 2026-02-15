import { hasFreshCache, getCachedPOIs, cachePOIs, evictStaleCache } from './poiCache';
import { fetchSupplyPOIs, fetchBailOutPOIs } from './overpass';
import { downsampleRouteForOverpass, routeHash } from '../utils/routeDownsampler';
import { getDistanceAlongRoute } from '../utils/geo';
import { debugLog } from '../utils/debugLogger';
import type { SupplyPoint } from '../types';

/**
 * Get supply POIs — from cache if fresh, otherwise fetch from Overpass.
 * Returns SupplyPoints WITH distanceFromStartKm calculated.
 */
export async function getOrFetchSupplyPOIs(
  routeGeometry: GeoJSON.LineString,
  corridorWidthKm: number,
  signal?: AbortSignal,
): Promise<SupplyPoint[]> {
  const hash = routeHash(routeGeometry);

  // Check cache
  const isFresh = await hasFreshCache(hash, corridorWidthKm, 'overpass');
  if (isFresh) {
    const cached = await getCachedPOIs(hash);
    if (cached.length > 0) {
      debugLog.info('cache', 'hit:overpass', { count: cached.length, hash: hash.slice(0, 8) });
      return cached;
    }
  }

  // Cache miss — fetch from Overpass
  debugLog.info('cache', 'miss:overpass', { hash: hash.slice(0, 8) });
  const polyline = downsampleRouteForOverpass(routeGeometry);
  const rawPOIs = await fetchSupplyPOIs(polyline, corridorWidthKm, signal);

  // Add distanceFromStartKm
  const pois: SupplyPoint[] = rawPOIs.map(poi => ({
    ...poi,
    distanceFromStartKm: getDistanceAlongRoute(routeGeometry, poi.lat, poi.lng),
  }));

  // Sort by distance
  pois.sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);

  // Cache results (fire and forget)
  cachePOIs(hash, corridorWidthKm, pois, 'overpass').catch(() => {});

  // Evict stale entries periodically (fire and forget)
  evictStaleCache().catch(() => {});

  return pois;
}

/**
 * Get bail-out POIs — from cache if fresh, otherwise fetch from Overpass.
 */
export async function getOrFetchBailOutPOIs(
  routeGeometry: GeoJSON.LineString,
  corridorWidthKm: number,
  signal?: AbortSignal,
): Promise<SupplyPoint[]> {
  // Use a different cache key suffix for bail-out (wider corridor)
  const hash = routeHash(routeGeometry) + '_bailout';

  const isFresh = await hasFreshCache(hash, corridorWidthKm + 5, 'overpass');
  if (isFresh) {
    const cached = await getCachedPOIs(hash);
    if (cached.length > 0) {
      debugLog.info('cache', 'hit:bailout', { count: cached.length });
      return cached;
    }
  }

  debugLog.info('cache', 'miss:bailout');
  const polyline = downsampleRouteForOverpass(routeGeometry);
  const rawPOIs = await fetchBailOutPOIs(polyline, corridorWidthKm, signal);

  const pois: SupplyPoint[] = rawPOIs.map(poi => ({
    ...poi,
    distanceFromStartKm: getDistanceAlongRoute(routeGeometry, poi.lat, poi.lng),
  }));

  pois.sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);

  cachePOIs(hash, corridorWidthKm + 5, pois, 'overpass').catch(() => {});

  return pois;
}
