import { useEffect } from 'react';
import { useRouteStore } from '../store/routeStore';
import { useSupplyStore } from '../store/supplyStore';
import { getOrFetchBailOutPOIs } from '../services/cacheManager';
import { debugLog } from '../utils/debugLogger';

/**
 * Bail-out points (stations, halts, hospitals) in a wider corridor, only
 * while that layer is on. No abort signal for Overpass — see
 * useSupplyPointFetching for why; stale results are dropped instead.
 */
export function useBailOutFetching(): void {
  const routeGeometry = useRouteStore((s) => s.routeGeometry);
  const corridorWidthKm = useSupplyStore((s) => s.corridorWidthKm);
  const enabled = useSupplyStore((s) => s.layers.bailout);
  const setBailOutPoints = useSupplyStore((s) => s.setBailOutPoints);

  useEffect(() => {
    if (!routeGeometry || !enabled) {
      setBailOutPoints([]);
      return;
    }
    let cancelled = false;
    getOrFetchBailOutPOIs(routeGeometry, corridorWidthKm)
      .then((points) => { if (!cancelled) setBailOutPoints(points); })
      .catch((err) => debugLog.error('bailout', 'fetch failed', err instanceof Error ? err.message : String(err)));
    return () => { cancelled = true; };
  }, [routeGeometry, enabled, corridorWidthKm, setBailOutPoints]);
}
