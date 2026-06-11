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
    // Local binding narrows the type across the async closure (no ! assertions)
    const geometry = routeGeometry;

    const controller = new AbortController();

    async function load() {
      const bounds = getRouteBounds(geometry, 5); // 5km padding
      const passes = await fetchMountainPasses(bounds, controller.signal);

      // Route length in km
      const routeLengthKm = length(lineString(geometry.coordinates), { units: 'kilometers' });

      // Compute distance along route for each pass and filter by proximity
      const withDistance = passes
        .map(p => ({
          pass: { ...p, distanceFromStartKm: getDistanceAlongRoute(geometry, p.lat, p.lng) },
          distToRoute: getDistanceToRoute(geometry, p.lat, p.lng),
        }))
        .filter(({ pass, distToRoute }) =>
          distToRoute <= MAX_DISTANCE_FROM_ROUTE_KM &&
          pass.distanceFromStartKm > 0.5 && // not at very start
          pass.distanceFromStartKm < routeLengthKm - 0.5 // not at very end
        )
        .sort((a, b) => a.pass.distanceFromStartKm - b.pass.distanceFromStartKm)
        .map(({ pass }) => pass);

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
