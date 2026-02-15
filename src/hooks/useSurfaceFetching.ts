import { useEffect } from 'react';
import { useRouteStore } from '../store/routeStore';
import { queryOverpassWithFailover } from '../services/overpass';
import {
  buildSurfaceQuery,
  analyzeSurface,
  type OverpassWayElement,
} from '../services/surfaceAnalysis';
import { downsampleRouteForOverpass } from '../utils/routeDownsampler';
import { debugLog } from '../utils/debugLogger';

/** Radius in metres for the surface Overpass query */
const SURFACE_QUERY_RADIUS_M = 100;

/**
 * Fetches surface quality data from Overpass when the route changes,
 * classifies segments, and stores the result in routeStore.surfaceSummary.
 */
export function useSurfaceFetching(): void {
  const routeGeometry = useRouteStore((s) => s.routeGeometry);
  const setSurfaceSummary = useRouteStore((s) => s.setSurfaceSummary);

  useEffect(() => {
    if (!routeGeometry) {
      setSurfaceSummary(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadSurface() {
      debugLog.info('surface', 'fetch:start');

      try {
        // Downsample route for Overpass polyline
        const polyline = downsampleRouteForOverpass(routeGeometry!);

        // Build and execute query
        const query = buildSurfaceQuery(polyline, SURFACE_QUERY_RADIUS_M);
        const elements = await queryOverpassWithFailover(query, controller.signal);

        if (cancelled) return;

        // Filter to way elements with geometry
        // The Overpass `out geom;` response includes a `geometry` field on ways
        // which is not on the base OverpassElement type, so we cast through unknown.
        const ways = (elements as unknown as OverpassWayElement[]).filter(
          (el) => el.type === 'way' && el.geometry && el.geometry.length > 0,
        );

        debugLog.info('surface', 'fetch:ways-received', {
          totalElements: elements.length,
          waysWithGeom: ways.length,
        });

        // Analyze and store
        const summary = analyzeSurface(routeGeometry!, ways);

        if (!cancelled) {
          setSurfaceSummary(summary);
          debugLog.info('surface', 'fetch:done', {
            segments: summary.segments.length,
            breakdown: summary.breakdown,
          });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        debugLog.error(
          'surface',
          'fetch:error',
          err instanceof Error ? err.message : String(err),
        );
        // Don't toast — surface overlay is non-critical
        if (!cancelled) {
          setSurfaceSummary(null);
        }
      }
    }

    loadSurface();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [routeGeometry, setSurfaceSummary]);
}
