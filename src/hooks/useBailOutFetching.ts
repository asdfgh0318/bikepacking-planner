import { useEffect } from 'react';
import { useRouteStore } from '../store/routeStore';
import { useSupplyStore } from '../store/supplyStore';
import { getOrFetchBailOutPOIs } from '../services/cacheManager';
import { debugLog } from '../utils/debugLogger';

/**
 * Fetches bail-out points (train stations, halts, hospitals) when enabled and route exists.
 * Uses a wider corridor (corridorWidthKm + 5) via the cacheManager, which handles
 * Overpass fetching, classification, distance calculation, and caching.
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
        // cacheManager handles: cache check, Overpass fetch, classification,
        // distanceFromStartKm calculation, sorting, and caching results.
        const points = await getOrFetchBailOutPOIs(routeGeometry!, corridorWidthKm, controller.signal);
        if (cancelled) return;

        setBailOutPoints(points);
        debugLog.info('bailout', 'points:loaded', { total: points.length });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        debugLog.error('bailout', 'fetch:error', err instanceof Error ? err.message : String(err));
      }
    }

    loadBailOut();
    return () => { cancelled = true; controller.abort(); };
  }, [routeGeometry, showBailOut, corridorWidthKm, setBailOutPoints]);
}
