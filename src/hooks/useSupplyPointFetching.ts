import { useEffect } from 'react';
import { toast } from 'sonner';
import { useRouteStore } from '../store/routeStore';
import { useSupplyStore } from '../store/supplyStore';
import { fetchPaczkomaty } from '../services/inpost';
import { getOrFetchSupplyPOIs } from '../services/cacheManager';
import { splitRouteIntoDays } from '../services/daySplitter';
import { analyzeSupplyGaps, analyzeWaterGaps, enrichGapsWithSuggestions } from '../services/gapAnalysis';
import { bufferRoute, isPointInCorridor, getDistanceAlongRoute, getRouteBounds } from '../utils/geo';
import { debugLog } from '../utils/debugLogger';
import type { SupplyPoint } from '../types';

/**
 * Fetches supply points (Overpass POIs + InPost paczkomaty) when route or
 * corridor changes. Overpass fetching is delegated to the cacheManager which
 * handles caching, classification, and distance calculation. InPost results
 * are still fetched via bbox and corridor-filtered here. After merging, runs
 * gap analysis and day splitting.
 */
export function useSupplyPointFetching(): void {
  const routeGeometry = useRouteStore((s) => s.routeGeometry);
  const dailyTargetKm = useRouteStore((s) => s.dailyTargetKm);
  const setDaySegments = useRouteStore((s) => s.setDaySegments);

  const corridorWidthKm = useSupplyStore((s) => s.corridorWidthKm);
  const setSupplyPoints = useSupplyStore((s) => s.setSupplyPoints);
  const setSupplyGaps = useSupplyStore((s) => s.setSupplyGaps);
  const setWaterGaps = useSupplyStore((s) => s.setWaterGaps);
  const setIsLoading = useSupplyStore((s) => s.setIsLoading);

  useEffect(() => {
    if (!routeGeometry) {
      setSupplyPoints([]);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadSupplyPoints() {
      setIsLoading(true);
      debugLog.info('supply', 'fetch:start', { corridorWidthKm });
      try {
        // Fire 2 parallel calls: Overpass (via cache manager) + InPost
        const bounds = getRouteBounds(routeGeometry!, corridorWidthKm + 1);
        const [overpassResult, paczkomatyRaw] = await Promise.allSettled([
          getOrFetchSupplyPOIs(routeGeometry!, corridorWidthKm, controller.signal),
          fetchPaczkomaty(bounds, controller.signal),
        ]);

        // Log results
        const rawCounts = {
          overpass: overpassResult.status === 'fulfilled' ? overpassResult.value.length : 'FAIL',
          paczkomaty: paczkomatyRaw.status === 'fulfilled' ? paczkomatyRaw.value.length : 'FAIL',
        };
        debugLog.info('supply', 'fetch:raw-counts', rawCounts);
        if (overpassResult.status === 'rejected') debugLog.error('supply', 'fetch:overpass:fail', String(overpassResult.reason));
        if (paczkomatyRaw.status === 'rejected') debugLog.error('supply', 'fetch:paczkomaty:fail', String(paczkomatyRaw.reason));

        if (cancelled) return;

        const supplyPoints: SupplyPoint[] = [];

        // Add Overpass results (already classified, with distanceFromStartKm from cacheManager)
        if (overpassResult.status === 'fulfilled') {
          supplyPoints.push(...overpassResult.value);
        }

        // Process InPost paczkomaty — still needs corridor filtering (bbox-based API)
        if (paczkomatyRaw.status === 'fulfilled') {
          const corridor = bufferRoute(routeGeometry!, corridorWidthKm);
          for (const p of paczkomatyRaw.value) {
            try {
              const lat = p?.location?.latitude;
              const lng = p?.location?.longitude;
              if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) continue;
              if (isPointInCorridor(lat, lng, corridor)) {
                const addressStr = p.address
                  ? `${p.address.line1 ?? ''}, ${p.address.line2 ?? ''}`.trim()
                  : '';
                supplyPoints.push({
                  id: `inpost-${p.name}`,
                  name: p.name || 'Paczkomat',
                  lat,
                  lng,
                  type: 'paczkomat',
                  distanceFromStartKm: getDistanceAlongRoute(
                    routeGeometry!, lat, lng
                  ),
                  details: {
                    address: addressStr,
                    is24h: p.location_247,
                    openingHours: p.opening_hours,
                  },
                });
              }
            } catch {
              // Skip malformed paczkomat entry
              continue;
            }
          }
        }

        supplyPoints.sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);

        if (!cancelled) {
          const byType: Record<string, number> = {};
          for (const sp of supplyPoints) byType[sp.type] = (byType[sp.type] || 0) + 1;
          debugLog.info('supply', 'points:loaded', { total: supplyPoints.length, ...byType });

          setSupplyPoints(supplyPoints);

          // Analyze supply gaps
          const routeStats = useRouteStore.getState().routeStats;
          const totalDistKm = routeStats?.distanceKm ?? 0;
          const rawGaps = analyzeSupplyGaps(supplyPoints, totalDistKm);
          const gaps = enrichGapsWithSuggestions(rawGaps, supplyPoints, corridorWidthKm);
          setSupplyGaps(gaps);
          const wGaps = analyzeWaterGaps(supplyPoints, totalDistKm);
          setWaterGaps(wGaps);
          debugLog.info('supply', 'gaps:analyzed', {
            foodGaps: gaps.length, foodDangers: gaps.filter(g => g.severity === 'danger').length,
            waterGaps: wGaps.length, waterDangers: wGaps.filter(g => g.severity === 'danger').length,
            gapsWithAlternatives: gaps.filter(g => g.alternatives && g.alternatives.length > 0).length,
          });

          // Auto-calculate day segments
          if (routeGeometry) {
            const routingProfile = useRouteStore.getState().routingProfile;
            const segments = splitRouteIntoDays(routeGeometry, dailyTargetKm, supplyPoints, routingProfile);
            setDaySegments(segments);
            debugLog.info('route', 'days:split', { dayCount: segments.length, dailyTargetKm });
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        debugLog.error('supply', 'fetch:error', err instanceof Error ? err.message : String(err));
        toast.error('Failed to load supply points', { description: 'Check your connection and try again' });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadSupplyPoints();
    return () => { cancelled = true; controller.abort(); };
  }, [routeGeometry, corridorWidthKm, dailyTargetKm, setSupplyPoints, setIsLoading, setDaySegments, setSupplyGaps, setWaterGaps]);
}
