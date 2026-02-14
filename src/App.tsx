import { useEffect, useRef } from 'react';
import { MapView } from './components/Map/MapView';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ElevationProfile } from './components/ElevationProfile';
import { useRouteStore } from './store/routeStore';
import { useSupplyStore } from './store/supplyStore';
import { calculateRoute } from './services/brouter';
import { fetchPaczkomaty } from './services/inpost';
import { fetchShopsNearBbox, fetchWaterSourcesNearBbox, fetchCampsitesNearBbox, fetchRepairShopsNearBbox } from './services/overpass';
import { splitRouteIntoDays } from './services/daySplitter';
import { decodeRouteFromHash } from './services/routeStorage';
import { bufferRoute, isPointInCorridor, getDistanceAlongRoute, getRouteBounds } from './utils/geo';
import type { SupplyPoint } from './types';

function App() {
  const waypoints = useRouteStore((s) => s.waypoints);
  const setRouteGeometry = useRouteStore((s) => s.setRouteGeometry);
  const setRouteStats = useRouteStore((s) => s.setRouteStats);
  const setIsCalculating = useRouteStore((s) => s.setIsCalculating);
  const routeGeometry = useRouteStore((s) => s.routeGeometry);

  const corridorWidthKm = useSupplyStore((s) => s.corridorWidthKm);
  const setSupplyPoints = useSupplyStore((s) => s.setSupplyPoints);
  const setIsLoading = useSupplyStore((s) => s.setIsLoading);

  const dailyTargetKm = useRouteStore((s) => s.dailyTargetKm);
  const setDaySegments = useRouteStore((s) => s.setDaySegments);

  const setWaypoints = useRouteStore((s) => s.setWaypoints);

  const routingProfile = useRouteStore((s) => s.routingProfile);

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

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsCalculating(true);
      try {
        const { geometry, stats } = await calculateRoute(waypoints, routingProfile);
        setRouteGeometry(geometry);
        setRouteStats(stats);
      } catch (err) {
        console.error('Route calculation failed:', err);
        const geom: GeoJSON.LineString = {
          type: 'LineString',
          coordinates: waypoints.map((w) => [w.lng, w.lat]),
        };
        setRouteGeometry(geom);
      } finally {
        setIsCalculating(false);
      }
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [waypoints, routingProfile, setRouteGeometry, setRouteStats, setIsCalculating, setSupplyPoints]);

  // Fetch supply points when route or corridor changes
  useEffect(() => {
    if (!routeGeometry) {
      setSupplyPoints([]);
      return;
    }

    let cancelled = false;

    async function loadSupplyPoints() {
      setIsLoading(true);
      try {
        const corridor = bufferRoute(routeGeometry!, corridorWidthKm);
        const bounds = getRouteBounds(routeGeometry!, corridorWidthKm + 1);

        const [paczkomatyRaw, shopsRaw, waterRaw, campsiteRaw, repairRaw] = await Promise.allSettled([
          fetchPaczkomaty(bounds),
          fetchShopsNearBbox(bounds),
          fetchWaterSourcesNearBbox(bounds),
          fetchCampsitesNearBbox(bounds),
          fetchRepairShopsNearBbox(bounds),
        ]);

        if (cancelled) return;

        const supplyPoints: SupplyPoint[] = [];

        if (paczkomatyRaw.status === 'fulfilled') {
          for (const p of paczkomatyRaw.value) {
            if (isPointInCorridor(p.location.latitude, p.location.longitude, corridor)) {
              supplyPoints.push({
                id: `inpost-${p.name}`,
                name: p.name,
                lat: p.location.latitude,
                lng: p.location.longitude,
                type: 'paczkomat',
                distanceFromStartKm: getDistanceAlongRoute(
                  routeGeometry!, p.location.latitude, p.location.longitude
                ),
                details: {
                  address: `${p.address.line1}, ${p.address.line2}`,
                  is24h: p.location_247,
                  openingHours: p.opening_hours,
                },
              });
            }
          }
        }

        if (shopsRaw.status === 'fulfilled') {
          for (const s of shopsRaw.value) {
            if (isPointInCorridor(s.lat, s.lng, corridor)) {
              const type =
                s.brand.toLowerCase().includes('żabka') || s.brand.toLowerCase().includes('zabka')
                  ? 'zabka'
                  : s.brand.toLowerCase().includes('biedronka')
                    ? 'biedronka'
                    : 'shop';

              supplyPoints.push({
                id: `shop-${s.id}`,
                name: s.name,
                lat: s.lat,
                lng: s.lng,
                type,
                distanceFromStartKm: getDistanceAlongRoute(routeGeometry!, s.lat, s.lng),
                details: { openingHours: s.openingHours },
              });
            }
          }
        }

        if (waterRaw.status === 'fulfilled') {
          for (const w of waterRaw.value) {
            if (isPointInCorridor(w.lat, w.lng, corridor)) {
              supplyPoints.push({
                id: `water-${w.id}`,
                name: w.name,
                lat: w.lat,
                lng: w.lng,
                type: 'water',
                distanceFromStartKm: getDistanceAlongRoute(routeGeometry!, w.lat, w.lng),
                details: { waterType: w.waterType },
              });
            }
          }
        }

        if (campsiteRaw.status === 'fulfilled') {
          for (const c of campsiteRaw.value) {
            if (isPointInCorridor(c.lat, c.lng, corridor)) {
              supplyPoints.push({
                id: `camp-${c.id}`,
                name: c.name,
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
          }
        }

        if (repairRaw.status === 'fulfilled') {
          for (const r of repairRaw.value) {
            if (isPointInCorridor(r.lat, r.lng, corridor)) {
              supplyPoints.push({
                id: `repair-${r.id}`,
                name: r.name,
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
          }
        }

        supplyPoints.sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);

        if (!cancelled) {
          setSupplyPoints(supplyPoints);

          // Auto-calculate day segments
          if (routeGeometry) {
            const segments = splitRouteIntoDays(routeGeometry, dailyTargetKm, supplyPoints);
            setDaySegments(segments);
          }
        }
      } catch (err) {
        console.error('Failed to load supply points:', err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadSupplyPoints();
    return () => { cancelled = true; };
  }, [routeGeometry, corridorWidthKm, dailyTargetKm, setSupplyPoints, setIsLoading, setDaySegments]);

  return (
    <div className="app">
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
