import { useEffect } from 'react';
import { useRouteStore } from '../store/routeStore';
import { useSupplyStore } from '../store/supplyStore';
import { splitRouteIntoDays } from '../services/daySplitter';
import { debugLog } from '../utils/debugLogger';

/**
 * Keep `daySegments` in sync with the current route.
 *
 * Runs as soon as a route exists — supply points are NOT a prerequisite, so
 * the trip plan (and every panel that gates on it) appears immediately
 * instead of waiting for Overpass. When supply points later arrive, the
 * splitter re-runs to align day-ends with shops/campsites where it can.
 */
export function useDaySplitting(): void {
  const routeGeometry = useRouteStore((s) => s.routeGeometry);
  const dailyTargetKm = useRouteStore((s) => s.dailyTargetKm);
  const routingProfile = useRouteStore((s) => s.routingProfile);
  const setDaySegments = useRouteStore((s) => s.setDaySegments);
  const supplyPoints = useSupplyStore((s) => s.supplyPoints);

  useEffect(() => {
    if (!routeGeometry) {
      setDaySegments([]);
      return;
    }
    const segments = splitRouteIntoDays(routeGeometry, dailyTargetKm, supplyPoints, routingProfile);
    setDaySegments(segments);
    debugLog.info('route', 'days:split', {
      dayCount: segments.length,
      dailyTargetKm,
      withSupplyAlignment: supplyPoints.length > 0,
    });
  }, [routeGeometry, dailyTargetKm, routingProfile, supplyPoints, setDaySegments]);
}
