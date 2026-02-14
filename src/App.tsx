import { useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { MapView } from './components/Map/MapView';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ElevationProfile } from './components/ElevationProfile';
import { useRouteStore } from './store/routeStore';
import { useSupplyStore } from './store/supplyStore';
import { calculateRoute } from './services/brouter';
import { fetchPaczkomaty } from './services/inpost';
import { fetchShopsNearBbox, fetchWaterSourcesNearBbox, fetchCampsitesNearBbox, fetchRepairShopsNearBbox, fetchBailOutPointsNearBbox } from './services/overpass';
import { splitRouteIntoDays } from './services/daySplitter';
import { analyzeSupplyGaps, analyzeWaterGaps } from './services/gapAnalysis';
import { decodeRouteFromHash } from './services/routeStorage';
import { bufferRoute, isPointInCorridor, getDistanceAlongRoute, getRouteBounds } from './utils/geo';
import { fetchRouteWeather } from './services/weather';
import { useResupplyStore } from './store/resupplyStore';
import { debugLog } from './utils/debugLogger';
import type { SupplyPoint } from './types';

function App() {
  const waypoints = useRouteStore((s) => s.waypoints);
  const setRouteGeometry = useRouteStore((s) => s.setRouteGeometry);
  const setRouteStats = useRouteStore((s) => s.setRouteStats);
  const setIsCalculating = useRouteStore((s) => s.setIsCalculating);
  const routeGeometry = useRouteStore((s) => s.routeGeometry);

  const corridorWidthKm = useSupplyStore((s) => s.corridorWidthKm);
  const setSupplyPoints = useSupplyStore((s) => s.setSupplyPoints);
  const setSupplyGaps = useSupplyStore((s) => s.setSupplyGaps);
  const setWaterGaps = useSupplyStore((s) => s.setWaterGaps);
  const setBailOutPoints = useSupplyStore((s) => s.setBailOutPoints);
  const showBailOut = useSupplyStore((s) => s.showBailOut);
  const setIsLoading = useSupplyStore((s) => s.setIsLoading);

  const dailyTargetKm = useRouteStore((s) => s.dailyTargetKm);
  const setDaySegments = useRouteStore((s) => s.setDaySegments);

  const setWaypoints = useRouteStore((s) => s.setWaypoints);

  const routingProfile = useRouteStore((s) => s.routingProfile);
  const daySegments = useRouteStore((s) => s.daySegments);

  const tripStartDate = useResupplyStore((s) => s.resupplyConfig.tripStartDate);
  const setRouteWeather = useResupplyStore((s) => s.setRouteWeather);
  const setIsLoadingWeather = useResupplyStore((s) => s.setIsLoadingWeather);
  const routeWeather = useResupplyStore((s) => s.routeWeather);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Load shared route from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#route=')) {
      const encoded = hash.slice(7);
      const decoded = decodeRouteFromHash(encoded);
      if (decoded && decoded.waypoints.length >= 2) {
        setWaypoints(decoded.waypoints);
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [setWaypoints]);

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

  // Fetch supply points when route or corridor changes
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
  }, [routeGeometry, corridorWidthKm, dailyTargetKm, setSupplyPoints, setIsLoading, setDaySegments]);

  // Fetch bail-out points when enabled and route exists
  useEffect(() => {
    if (!routeGeometry || !showBailOut) {
      setBailOutPoints([]);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadBailOut() {
      try {
        const bounds = getRouteBounds(routeGeometry!, corridorWidthKm + 5); // wider corridor for bail-out
        const bailOutRaw = await fetchBailOutPointsNearBbox(bounds, controller.signal);
        if (cancelled) return;

        const corridor = bufferRoute(routeGeometry!, corridorWidthKm + 5);
        const points: SupplyPoint[] = [];

        for (const b of bailOutRaw) {
          try {
            if (typeof b.lat !== 'number' || typeof b.lng !== 'number' || isNaN(b.lat) || isNaN(b.lng)) continue;
            if (isPointInCorridor(b.lat, b.lng, corridor)) {
              points.push({
                id: `bailout-${b.id}`,
                name: b.name || 'Bail-out point',
                lat: b.lat,
                lng: b.lng,
                type: b.bailOutType,
                distanceFromStartKm: getDistanceAlongRoute(routeGeometry!, b.lat, b.lng),
                details: { phone: b.phone },
              });
            }
          } catch {
            // Skip malformed bail-out entry
            continue;
          }
        }

        points.sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);
        if (!cancelled) {
          setBailOutPoints(points);
          debugLog.info('bailout', 'points:loaded', { total: points.length });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        debugLog.error('bailout', 'fetch:error', err instanceof Error ? err.message : String(err));
      }
    }

    loadBailOut();
    return () => { cancelled = true; controller.abort(); };
  }, [routeGeometry, showBailOut, corridorWidthKm, setBailOutPoints]);

  // Fetch weather forecast when route and trip date are available
  useEffect(() => {
    if (!routeGeometry || daySegments.length === 0 || !tripStartDate) {
      setRouteWeather(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setIsLoadingWeather(true);

    async function loadWeather() {
      try {
        debugLog.info('weather', 'fetch:start', { tripStartDate, days: daySegments.length });
        const weather = await fetchRouteWeather(routeGeometry!, daySegments, tripStartDate, controller.signal);
        if (!cancelled) {
          setRouteWeather(weather);
          const available = weather.days.filter(d => d.weatherCode !== -1).length;
          debugLog.info('weather', 'fetch:success', {
            daysWithData: available,
            totalDays: weather.days.length,
            sampleCoord: weather.sampleCoord,
          });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        debugLog.error('weather', 'fetch:error', err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setIsLoadingWeather(false);
      }
    }

    loadWeather();
    return () => { cancelled = true; controller.abort(); };
  }, [routeGeometry, daySegments, tripStartDate, setRouteWeather, setIsLoadingWeather]);

  // Re-analyze water gaps when weather data arrives (heat-adjusted thresholds)
  useEffect(() => {
    if (!routeWeather) return;
    const supplyPoints = useSupplyStore.getState().supplyPoints;
    const routeStats = useRouteStore.getState().routeStats;
    const totalDistKm = routeStats?.distanceKm ?? 0;
    if (supplyPoints.length === 0 || totalDistKm <= 0) return;
    const maxTempC = Math.max(...routeWeather.days.map(d => d.tempMax));
    if (maxTempC <= 30) return; // no adjustment needed
    const wGaps = analyzeWaterGaps(supplyPoints, totalDistKm, maxTempC);
    setWaterGaps(wGaps);
    debugLog.info('supply', 'waterGaps:heat-adjusted', {
      maxTempC, waterGaps: wGaps.length,
      waterDangers: wGaps.filter(g => g.severity === 'danger').length,
    });
  }, [routeWeather, setWaterGaps]);

  return (
    <div className="app">
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--surface-2)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            fontFamily: 'inherit',
          },
        }}
      />
      <Sidebar />
      <div className="main-area">
        <main className="map-container">
          <MapView />
        </main>
        <ElevationProfile />
      </div>
    </div>
  );
}

export default App;
