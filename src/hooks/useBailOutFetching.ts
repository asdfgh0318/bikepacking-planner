import { useEffect } from 'react';
import { useRouteStore } from '../store/routeStore';
import { useSupplyStore } from '../store/supplyStore';
import { getOrFetchBailOutPOIs } from '../services/cacheManager';
import { debugLog } from '../utils/debugLogger';

/**
 * Bail-out points (stations, halts, hospitals) in a wider corridor, only
 * while that layer is on. Debounced and abortable like
 * useSupplyPointFetching, so superseded queries are cancelled.
 */
const DEBOUNCE_MS = 600;

export function useBailOutFetching(): void {
  const routeGeometry = useRouteStore((s) => s.routeGeometry);
  const corridorWidthKm = useSupplyStore((s) => s.corridorWidthKm);
  const enabled = useSupplyStore((s) => s.layers.bailout);
  const setBailOutPoints = useSupplyStore((s) => s.setBailOutPoints);
  const retryNonce = useSupplyStore((s) => s.retryNonce);

  useEffect(() => {
    if (!routeGeometry || !enabled) {
      setBailOutPoints([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      getOrFetchBailOutPOIs(routeGeometry, corridorWidthKm, controller.signal)
        .then((points) => { if (!controller.signal.aborted) setBailOutPoints(points); })
        .catch((err) => {
          if (controller.signal.aborted) return;
          debugLog.error('bailout', 'fetch failed', err instanceof Error ? err.message : String(err));
        });
    }, DEBOUNCE_MS);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [routeGeometry, enabled, corridorWidthKm, retryNonce, setBailOutPoints]);
}
