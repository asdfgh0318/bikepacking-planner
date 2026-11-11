import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Waypoint, RouteStats, DaySegment, RoutingProfile } from '../types';

interface RouteState {
  waypoints: Waypoint[];
  routeGeometry: GeoJSON.LineString | null;
  routeStats: RouteStats | null;
  isCalculating: boolean;
  daySegments: DaySegment[];
  dailyTargetKm: number;
  routingProfile: RoutingProfile;
  /** When true, the current geometry came from a GPX import and should not be overwritten by BRouter. */
  gpxGeometryLoaded: boolean;
  /**
   * True while routeGeometry does not match the waypoints/profile: after an
   * edit that BRouter has not answered yet, or for a straight-line fallback.
   * Persisted, so a reload in that state re-routes instead of trusting it.
   */
  geometryStale: boolean;

  addWaypoint: (lat: number, lng: number) => void;
  updateWaypoint: (id: string, lat: number, lng: number) => void;
  removeWaypoint: (id: string) => void;
  clearRoute: () => void;
  /** `authoritative: false` marks a stand-in line that must be re-routed on the next load. */
  setRouteGeometry: (geom: GeoJSON.LineString | null, authoritative?: boolean) => void;
  setRouteStats: (stats: RouteStats | null) => void;
  setIsCalculating: (v: boolean) => void;
  setWaypoints: (wps: Waypoint[]) => void;
  setDaySegments: (segs: DaySegment[]) => void;
  setDailyTargetKm: (km: number) => void;
  setRoutingProfile: (p: RoutingProfile) => void;
  setGpxGeometryLoaded: (v: boolean) => void;
}

/** Ids survive reloads (waypoints are persisted), so a counter would collide. */
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/**
 * Structural equality for day segments. The day splitter re-runs whenever
 * supply points refresh and always returns fresh arrays; without this check
 * every refresh would propagate an identical-but-new array to subscribers
 * (aborting in-flight weather fetches, re-arming plan regeneration).
 * Boundaries imply the derived fields (coords, elevation, hours), but
 * supplyStops/nightStop change independently, so they're compared too.
 */
function daySegmentsEqual(a: DaySegment[], b: DaySegment[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((s, i) => {
    const t = b[i];
    return (
      s.startKm === t.startKm &&
      s.endKm === t.endKm &&
      s.nightStop?.distanceFromStartKm === t.nightStop?.distanceFromStartKm &&
      s.supplyStops.length === t.supplyStops.length &&
      s.supplyStops.every((sp, j) => sp.id === t.supplyStops[j].id)
    );
  });
}

/**
 * localStorage that never throws. A dense GPX can exceed the quota, and
 * persist writes synchronously inside set(): an escaping error would abort
 * whichever hook or handler made the change. Degrade to not-persisted.
 */
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch { /* quota or no storage */ }
  },
  removeItem: (key: string): void => {
    try { localStorage.removeItem(key); } catch { /* no storage */ }
  },
};

/**
 * A restored geometry is authoritative (skip the BRouter round-trip on load,
 * keep the plan usable offline; same mechanism as GPX import) unless it was
 * saved out of sync with the waypoints/profile.
 */
export function mergePersistedRoute(persisted: unknown, current: RouteState): RouteState {
  const p = (persisted ?? {}) as Partial<RouteState>;
  return { ...current, ...p, gpxGeometryLoaded: !!p.routeGeometry && !p.geometryStale };
}

export const useRouteStore = create<RouteState>()(persist((set, get) => ({
  waypoints: [],
  routeGeometry: null,
  routeStats: null,
  isCalculating: false,
  daySegments: [],
  dailyTargetKm: 80,
  routingProfile: 'trekking',
  gpxGeometryLoaded: false,
  geometryStale: false,

  // User edits invalidate imported/restored geometry -> BRouter recalculates.
  addWaypoint: (lat, lng) =>
    set((s) => ({
      waypoints: [...s.waypoints, { id: newId(), lat, lng }],
      gpxGeometryLoaded: false,
      geometryStale: true,
    })),

  updateWaypoint: (id, lat, lng) =>
    set((s) => ({
      waypoints: s.waypoints.map((w) => (w.id === id ? { ...w, lat, lng } : w)),
      gpxGeometryLoaded: false,
      geometryStale: true,
    })),

  removeWaypoint: (id) =>
    set((s) => ({
      waypoints: s.waypoints.filter((w) => w.id !== id),
      gpxGeometryLoaded: false,
      geometryStale: true,
    })),

  clearRoute: () =>
    set({ waypoints: [], routeGeometry: null, routeStats: null, daySegments: [], gpxGeometryLoaded: false, geometryStale: false }),

  setRouteGeometry: (geom, authoritative = true) => set({ routeGeometry: geom, geometryStale: !authoritative }),
  setRouteStats: (stats) => set({ routeStats: stats }),
  setIsCalculating: (v) => set({ isCalculating: v }),
  setWaypoints: (wps) => set({ waypoints: wps, gpxGeometryLoaded: false, geometryStale: true }),
  setDaySegments: (segs) => {
    if (daySegmentsEqual(get().daySegments, segs)) return;
    set({ daySegments: segs });
  },
  setDailyTargetKm: (km) => set({ dailyTargetKm: Math.max(20, Math.min(300, km)) }),
  setRoutingProfile: (p) => set({ routingProfile: p, gpxGeometryLoaded: false, geometryStale: true }),
  setGpxGeometryLoaded: (v) => set({ gpxGeometryLoaded: v }),
}), {
  name: 'bikepacking-route',
  storage: createJSONStorage(() => safeLocalStorage),
  // Persist the inputs and the computed geometry; day segments, surface and
  // passes are re-derived on load.
  partialize: (s) => ({
    waypoints: s.waypoints,
    routeGeometry: s.routeGeometry,
    geometryStale: s.geometryStale,
    routeStats: s.routeStats,
    dailyTargetKm: s.dailyTargetKm,
    routingProfile: s.routingProfile,
  }),
  merge: mergePersistedRoute,
}));
