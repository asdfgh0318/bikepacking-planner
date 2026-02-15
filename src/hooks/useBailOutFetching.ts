import { useEffect } from 'react';
import { useRouteStore } from '../store/routeStore';
import { useSupplyStore } from '../store/supplyStore';
import { fetchBailOutPointsNearBbox } from '../services/overpass';
import { bufferRoute, isPointInCorridor, getDistanceAlongRoute, getRouteBounds } from '../utils/geo';
import { debugLog } from '../utils/debugLogger';
import type { SupplyPoint } from '../types';

/**
 * Fetches bail-out points (train stations, hospitals) when enabled and route exists.
 * Uses a wider corridor (corridorWidthKm + 5) to catch nearby escape options.
 */
export function useBailOutFetching(): void {
  const routeGeometry = useRouteStore((s) => s.routeGeometry);

  const corridorWidthKm = useSupplyStore((s) => s.corridorWidthKm);
  const showBailOut = useSupplyStore((s) => s.showBailOut);
  const setBailOutPoints = useSupplyStore((s) => s.setBailOutPoints);

  useEffect(() => {
    if (!routeGeometry || !showBailOut) {
      setBailOutPoints([]);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadBailOut() {
      try {
        const bounds = getRouteBounds(routeGeometry!, corridorWidthKm + 5); // wider corridor for bail-out
        const bailOutRaw = await fetchBailOutPointsNearBbox(bounds, controller.signal);
        if (cancelled) return;

        const corridor = bufferRoute(routeGeometry!, corridorWidthKm + 5);
        const points: SupplyPoint[] = [];

        for (const b of bailOutRaw) {
          try {
            if (typeof b.lat !== 'number' || typeof b.lng !== 'number' || isNaN(b.lat) || isNaN(b.lng)) continue;
            if (isPointInCorridor(b.lat, b.lng, corridor)) {
              points.push({
                id: `bailout-${b.id}`,
                name: b.name || 'Bail-out point',
                lat: b.lat,
                lng: b.lng,
                type: b.bailOutType,
                distanceFromStartKm: getDistanceAlongRoute(routeGeometry!, b.lat, b.lng),
                details: { phone: b.phone },
              });
            }
          } catch {
            // Skip malformed bail-out entry
            continue;
          }
        }

        points.sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);
        if (!cancelled) {
          setBailOutPoints(points);
          debugLog.info('bailout', 'points:loaded', { total: points.length });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        debugLog.error('bailout', 'fetch:error', err instanceof Error ? err.message : String(err));
      }
    }

    loadBailOut();
    return () => { cancelled = true; controller.abort(); };
  }, [routeGeometry, showBailOut, corridorWidthKm, setBailOutPoints]);
}
