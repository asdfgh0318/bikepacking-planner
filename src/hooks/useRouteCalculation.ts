import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useRouteStore } from '../store/routeStore';
import { useSupplyStore } from '../store/supplyStore';
import { calculateRoute } from '../services/brouter';
import { debugLog } from '../utils/debugLogger';

/**
 * Handles route calculation when waypoints or routing profile change.
 * Also triggers day segment splitting after supply points are loaded.
 *
 * Includes a 500ms debounce to avoid excessive API calls during rapid edits.
 */
export function useRouteCalculation(): void {
  const waypoints = useRouteStore((s) => s.waypoints);
  const routingProfile = useRouteStore((s) => s.routingProfile);
  const setRouteGeometry = useRouteStore((s) => s.setRouteGeometry);
  const setRouteStats = useRouteStore((s) => s.setRouteStats);
  const setIsCalculating = useRouteStore((s) => s.setIsCalculating);
  const setSupplyPoints = useSupplyStore((s) => s.setSupplyPoints);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Recalculate route when waypoints change
  useEffect(() => {
    if (waypoints.length < 2) {
      setRouteGeometry(null);
      setRouteStats(null);
      setSupplyPoints([]);
      return;
    }

    const controller = new AbortController();

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsCalculating(true);
      debugLog.info('route', 'calc:start', { waypointCount: waypoints.length, profile: routingProfile });
      try {
        const { geometry, stats } = await calculateRoute(waypoints, routingProfile, controller.signal);
        setRouteGeometry(geometry);
        setRouteStats(stats);
        debugLog.info('route', 'calc:success', { distanceKm: stats.distanceKm, ascentM: stats.ascentM, points: geometry.coordinates.length });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const msg = err instanceof Error ? err.message : 'Using straight line between waypoints';
        debugLog.error('route', 'calc:fail', msg);
        toast.error('Route calculation failed', { description: msg });
        const geom: GeoJSON.LineString = {
          type: 'LineString',
          coordinates: waypoints.map((w) => [w.lng, w.lat]),
        };
        setRouteGeometry(geom);
      } finally {
        if (!controller.signal.aborted) {
          setIsCalculating(false);
        }
      }
    }, 500);

    return () => {
      clearTimeout(debounceRef.current);
      controller.abort();
    };
  }, [waypoints, routingProfile, setRouteGeometry, setRouteStats, setIsCalculating, setSupplyPoints]);
}
