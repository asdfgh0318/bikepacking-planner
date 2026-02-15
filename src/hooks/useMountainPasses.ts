import { useEffect } from 'react';
import { useRouteStore } from '../store/routeStore';
import { fetchMountainPasses } from '../services/wikidata';
import { getRouteBounds, getDistanceAlongRoute, getDistanceToRoute } from '../utils/geo';
import { debugLog } from '../utils/debugLogger';
import { length, lineString } from '@turf/turf';

/** Maximum perpendicular distance (km) from route to consider a pass relevant. */
const MAX_DISTANCE_FROM_ROUTE_KM = 2;

export function useMountainPasses(): void {
  const routeGeometry = useRouteStore((s) => s.routeGeometry);
  const setMountainPasses = useRouteStore((s) => s.setMountainPasses);

  useEffect(() => {
    if (!routeGeometry) {
      setMountainPasses([]);
      return;
    }

    const controller = new AbortController();

    async function load() {
      const bounds = getRouteBounds(routeGeometry!, 5); // 5km padding
      const passes = await fetchMountainPasses(bounds, controller.signal);

      // Route length in km
      const routeLengthKm = length(lineString(routeGeometry!.coordinates), { units: 'kilometers' });

      // Compute distance along route for each pass and filter by proximity
      const withDistance = passes
        .map(p => ({
          ...p,
          distanceFromStartKm: getDistanceAlongRoute(routeGeometry!, p.lat, p.lng),
          _distToRoute: getDistanceToRoute(routeGeometry!, p.lat, p.lng),
        }))
        .filter(p =>
          p._distToRoute <= MAX_DISTANCE_FROM_ROUTE_KM &&
          p.distanceFromStartKm > 0.5 && // not at very start
          p.distanceFromStartKm < routeLengthKm - 0.5 // not at very end
        )
        .sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm)
        .map(({ _distToRoute, ...rest }) => rest); // strip internal field

      // Limit to top 15 to avoid clutter
      const result = withDistance.slice(0, 15);

      debugLog.info('wikidata', 'passes:filtered', {
        total: passes.length,
        relevant: result.length,
        routeLengthKm: routeLengthKm.toFixed(1),
      });

      setMountainPasses(result);
    }

    load();
    return () => controller.abort();
  }, [routeGeometry, setMountainPasses]);
}
