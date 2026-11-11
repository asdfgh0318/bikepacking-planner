import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useRouteStore } from '../store/routeStore';
import { useSupplyStore } from '../store/supplyStore';
import { fetchPaczkomaty } from '../services/inpost';
import { getOrFetchSupplyPOIs } from '../services/cacheManager';
import { analyzeSupplyGaps, analyzeWaterGaps } from '../services/gapAnalysis';
import { projectOnRoute } from '../utils/geo';
import { debugLog } from '../utils/debugLogger';
import type { SupplyPoint } from '../types';

/**
 * Fetches supply points (Overpass POIs + InPost paczkomaty) when route or
 * corridor changes. Overpass fetching is delegated to the cacheManager which
 * handles caching, classification, and distance calculation. InPost results
 * are fetched around points along the route and corridor-filtered here.
 * After merging, runs gap analysis and day splitting.
 *
 * The effect is debounced and both fetches take the abort signal, so a
 * superseded query (corridor slider drag, quick route edits) is cancelled
 * instead of running through its retry and failover chain. Stale results
 * are also discarded by the version counter.
 */
const DEBOUNCE_MS = 600;

export function useSupplyPointFetching(): void {
  const routeGeometry = useRouteStore((s) => s.routeGeometry);

  const corridorWidthKm = useSupplyStore((s) => s.corridorWidthKm);
  const setSupplyPoints = useSupplyStore((s) => s.setSupplyPoints);
  const setSupplyGaps = useSupplyStore((s) => s.setSupplyGaps);
  const setWaterGaps = useSupplyStore((s) => s.setWaterGaps);
  const setIsLoading = useSupplyStore((s) => s.setIsLoading);
  const setOsmFailed = useSupplyStore((s) => s.setOsmFailed);
  const retryNonce = useSupplyStore((s) => s.retryNonce);

  // Track the current fetch version to discard stale results
  const versionRef = useRef(0);
  // The geometry the points currently in the store were loaded for.
  const loadedForRef = useRef<GeoJSON.LineString | null>(null);

  useEffect(() => {
    if (!routeGeometry) {
      // Bump the version so an in-flight fetch for the old route cannot
      // write its results back after the route is gone.
      versionRef.current++;
      loadedForRef.current = null;
      setSupplyPoints([]);
      setSupplyGaps([]);
      setWaterGaps([]);
      setIsLoading(false);
      setOsmFailed(false);
      return;
    }

    const controller = new AbortController();
    const version = ++versionRef.current;

    setIsLoading(true);

    async function loadSupplyPoints() {
      debugLog.info('supply', 'fetch:start', { corridorWidthKm, version });
      try {
        // Overpass (via cache manager) and InPost in parallel
        const [overpassResult, paczkomatyRaw] = await Promise.allSettled([
          getOrFetchSupplyPOIs(routeGeometry!, corridorWidthKm, controller.signal),
          fetchPaczkomaty(routeGeometry!, corridorWidthKm, controller.signal),
        ]);

        // Log results
        const rawCounts = {
          overpass: overpassResult.status === 'fulfilled' ? overpassResult.value.length : 'FAIL',
          paczkomaty: paczkomatyRaw.status === 'fulfilled' ? paczkomatyRaw.value.length : 'FAIL',
        };
        debugLog.info('supply', 'fetch:raw-counts', rawCounts);
        if (overpassResult.status === 'rejected') debugLog.error('supply', 'fetch:overpass:fail', String(overpassResult.reason));
        if (paczkomatyRaw.status === 'rejected') debugLog.error('supply', 'fetch:paczkomaty:fail', String(paczkomatyRaw.reason));

        // Discard stale results — a newer fetch has started
        if (version !== versionRef.current || controller.signal.aborted) {
          debugLog.debug('supply', 'fetch:stale', { version, current: versionRef.current });
          return;
        }

        // Overpass failing (429/502/504 are routine) is not "no shops here":
        // say so, offer a retry, and derive no gaps from missing data.
        // Lockers come from InPost and are still shown. Points already
        // loaded for this same route (another corridor width) are kept.
        const osmOk = overpassResult.status === 'fulfilled';
        setOsmFailed(!osmOk);
        if (!osmOk) {
          toast.error('Failed to load shops and water', { description: 'OpenStreetMap is not answering; retry in a minute' });
          if (loadedForRef.current === routeGeometry) return;
        }

        // Overpass results are already classified, with distanceFromStartKm from cacheManager
        const supplyPoints: SupplyPoint[] = overpassResult.status === 'fulfilled' ? [...overpassResult.value] : [];

        // Process InPost paczkomaty — still needs corridor filtering (radius-based API)
        if (paczkomatyRaw.status === 'fulfilled') {
          for (const p of paczkomatyRaw.value) {
            try {
              const lat = p?.location?.latitude;
              const lng = p?.location?.longitude;
              if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) continue;
              const { distKm, alongKm } = projectOnRoute(routeGeometry!, lat, lng);
              if (distKm <= corridorWidthKm) {
                const addressStr = p.address
                  ? `${p.address.line1 ?? ''}, ${p.address.line2 ?? ''}`.trim()
                  : '';
                supplyPoints.push({
                  id: `inpost-${p.name}`,
                  name: p.name || 'Paczkomat',
                  lat,
                  lng,
                  type: 'paczkomat',
                  distanceFromStartKm: alongKm,
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

        if (version === versionRef.current) {
          const byType: Record<string, number> = {};
          for (const sp of supplyPoints) byType[sp.type] = (byType[sp.type] || 0) + 1;
          debugLog.info('supply', 'points:loaded', { total: supplyPoints.length, ...byType });

          loadedForRef.current = osmOk ? routeGeometry : null;
          setSupplyPoints(supplyPoints);
          if (!osmOk) {
            setSupplyGaps([]);
            setWaterGaps([]);
            return;
          }

          // Analyze supply gaps
          const routeStats = useRouteStore.getState().routeStats;
          const totalDistKm = routeStats?.distanceKm ?? 0;
          // A locker is only food if a parcel was shipped to it; the shipping
          // plan handles that case, so gaps are measured shop to shop.
          const shopsOnly = supplyPoints.filter((p) => p.type !== 'paczkomat');
          const gaps = analyzeSupplyGaps(shopsOnly, totalDistKm);
          setSupplyGaps(gaps);
          const wGaps = analyzeWaterGaps(supplyPoints, totalDistKm);
          setWaterGaps(wGaps);
          debugLog.info('supply', 'gaps:analyzed', {
            foodGaps: gaps.length, foodDangers: gaps.filter(g => g.severity === 'danger').length,
            waterGaps: wGaps.length, waterDangers: wGaps.filter(g => g.severity === 'danger').length,
          });

          // useDaySplitting re-runs automatically once supplyPoints changes,
          // so day-end alignment with shops/campsites is picked up here.
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        debugLog.error('supply', 'fetch:error', err instanceof Error ? err.message : String(err));
        toast.error('Failed to load supply points', { description: 'Check your connection and try again' });
      } finally {
        if (version === versionRef.current) {
          setIsLoading(false);
        }
      }
    }

    const timer = setTimeout(loadSupplyPoints, DEBOUNCE_MS);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [routeGeometry, corridorWidthKm, retryNonce, setSupplyPoints, setIsLoading, setOsmFailed, setSupplyGaps, setWaterGaps]);
}
