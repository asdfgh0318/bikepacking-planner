import { useEffect } from 'react';
import { toast } from 'sonner';
import { useRouteStore } from '../store/routeStore';
import { useSupplyStore } from '../store/supplyStore';
import { fetchPaczkomaty } from '../services/inpost';
import { fetchShopsNearBbox, fetchWaterSourcesNearBbox, fetchCampsitesNearBbox, fetchRepairShopsNearBbox } from '../services/overpass';
import { splitRouteIntoDays } from '../services/daySplitter';
import { analyzeSupplyGaps, analyzeWaterGaps } from '../services/gapAnalysis';
import { bufferRoute, isPointInCorridor, getDistanceAlongRoute, getRouteBounds } from '../utils/geo';
import { debugLog } from '../utils/debugLogger';
import type { SupplyPoint } from '../types';

/**
 * Fetches supply points (shops, water, campsites, paczkomaty, repair) when route
 * or corridor changes. Processes results with per-element try-catch validation,
 * then runs gap analysis and day splitting.
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
        const corridor = bufferRoute(routeGeometry!, corridorWidthKm);
        const bounds = getRouteBounds(routeGeometry!, corridorWidthKm + 1);
        debugLog.debug('supply', 'fetch:bounds', bounds);

        const [paczkomatyRaw, shopsRaw, waterRaw, campsiteRaw, repairRaw] = await Promise.allSettled([
          fetchPaczkomaty(bounds, controller.signal),
          fetchShopsNearBbox(bounds, controller.signal),
          fetchWaterSourcesNearBbox(bounds, controller.signal),
          fetchCampsitesNearBbox(bounds, controller.signal),
          fetchRepairShopsNearBbox(bounds, controller.signal),
        ]);

        // Log each API result with raw counts
        const rawCounts = {
          paczkomaty: paczkomatyRaw.status === 'fulfilled' ? paczkomatyRaw.value.length : 'FAIL',
          shops: shopsRaw.status === 'fulfilled' ? shopsRaw.value.length : 'FAIL',
          water: waterRaw.status === 'fulfilled' ? waterRaw.value.length : 'FAIL',
          campsites: campsiteRaw.status === 'fulfilled' ? campsiteRaw.value.length : 'FAIL',
          repair: repairRaw.status === 'fulfilled' ? repairRaw.value.length : 'FAIL',
        };
        debugLog.info('supply', 'fetch:raw-counts', rawCounts);
        if (paczkomatyRaw.status === 'rejected') debugLog.error('supply', 'fetch:paczkomaty:fail', String(paczkomatyRaw.reason));
        if (shopsRaw.status === 'rejected') debugLog.error('supply', 'fetch:shops:fail', String(shopsRaw.reason));
        if (waterRaw.status === 'rejected') debugLog.error('supply', 'fetch:water:fail', String(waterRaw.reason));
        if (campsiteRaw.status === 'rejected') debugLog.error('supply', 'fetch:campsites:fail', String(campsiteRaw.reason));
        if (repairRaw.status === 'rejected') debugLog.error('supply', 'fetch:repair:fail', String(repairRaw.reason));

        if (cancelled) return;

        const supplyPoints: SupplyPoint[] = [];

        if (paczkomatyRaw.status === 'fulfilled') {
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

        if (shopsRaw.status === 'fulfilled') {
          let shopsInCorridor = 0;
          for (const s of shopsRaw.value) {
            try {
              if (typeof s.lat !== 'number' || typeof s.lng !== 'number' || isNaN(s.lat) || isNaN(s.lng)) continue;
              if (isPointInCorridor(s.lat, s.lng, corridor)) {
                shopsInCorridor++;
                const brandLower = (s.brand || '').toLowerCase();
                const type =
                  brandLower.includes('żabka') || brandLower.includes('zabka')
                    ? 'zabka'
                    : brandLower.includes('biedronka')
                      ? 'biedronka'
                      : 'shop';

                supplyPoints.push({
                  id: `shop-${s.id}`,
                  name: s.name || 'Shop',
                  lat: s.lat,
                  lng: s.lng,
                  type,
                  distanceFromStartKm: getDistanceAlongRoute(routeGeometry!, s.lat, s.lng),
                  details: { openingHours: s.openingHours },
                });
              }
            } catch {
              // Skip malformed shop entry
              continue;
            }
          }
          debugLog.info('supply', 'shops:corridor-filter', { raw: shopsRaw.value.length, inCorridor: shopsInCorridor });
        }

        if (waterRaw.status === 'fulfilled') {
          for (const w of waterRaw.value) {
            try {
              if (typeof w.lat !== 'number' || typeof w.lng !== 'number' || isNaN(w.lat) || isNaN(w.lng)) continue;
              if (isPointInCorridor(w.lat, w.lng, corridor)) {
                supplyPoints.push({
                  id: `water-${w.id}`,
                  name: w.name || 'Water source',
                  lat: w.lat,
                  lng: w.lng,
                  type: 'water',
                  distanceFromStartKm: getDistanceAlongRoute(routeGeometry!, w.lat, w.lng),
                  details: { waterType: w.waterType },
                });
              }
            } catch {
              // Skip malformed water entry
              continue;
            }
          }
        }

        if (campsiteRaw.status === 'fulfilled') {
          for (const c of campsiteRaw.value) {
            try {
              if (typeof c.lat !== 'number' || typeof c.lng !== 'number' || isNaN(c.lat) || isNaN(c.lng)) continue;
              if (isPointInCorridor(c.lat, c.lng, corridor)) {
                supplyPoints.push({
                  id: `camp-${c.id}`,
                  name: c.name || 'Campsite',
                  lat: c.lat,
                  lng: c.lng,
                  type: 'campsite',
                  distanceFromStartKm: getDistanceAlongRoute(routeGeometry!, c.lat, c.lng),
                  details: {
                    campsiteType: c.campsiteType,
                    capacity: c.capacity,
                    fee: c.fee,
                    openingHours: c.openingHours,
                  },
                });
              }
            } catch {
              // Skip malformed campsite entry
              continue;
            }
          }
        }

        if (repairRaw.status === 'fulfilled') {
          for (const r of repairRaw.value) {
            try {
              if (typeof r.lat !== 'number' || typeof r.lng !== 'number' || isNaN(r.lat) || isNaN(r.lng)) continue;
              if (isPointInCorridor(r.lat, r.lng, corridor)) {
                supplyPoints.push({
                  id: `repair-${r.id}`,
                  name: r.name || 'Repair',
                  lat: r.lat,
                  lng: r.lng,
                  type: 'repair',
                  distanceFromStartKm: getDistanceAlongRoute(routeGeometry!, r.lat, r.lng),
                  details: {
                    repairType: r.repairType,
                    phone: r.phone,
                    openingHours: r.openingHours,
                  },
                });
              }
            } catch {
              // Skip malformed repair entry
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
          const gaps = analyzeSupplyGaps(supplyPoints, totalDistKm);
          setSupplyGaps(gaps);
          const wGaps = analyzeWaterGaps(supplyPoints, totalDistKm);
          setWaterGaps(wGaps);
          debugLog.info('supply', 'gaps:analyzed', {
            foodGaps: gaps.length, foodDangers: gaps.filter(g => g.severity === 'danger').length,
            waterGaps: wGaps.length, waterDangers: wGaps.filter(g => g.severity === 'danger').length,
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
