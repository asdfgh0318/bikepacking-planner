import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

  addWaypoint: (lat: number, lng: number) => void;
  updateWaypoint: (id: string, lat: number, lng: number) => void;
  removeWaypoint: (id: string) => void;
  clearRoute: () => void;
  setRouteGeometry: (geom: GeoJSON.LineString | null) => void;
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

export const useRouteStore = create<RouteState>()(persist((set, get) => ({
  waypoints: [],
  routeGeometry: null,
  routeStats: null,
  isCalculating: false,
  daySegments: [],
  dailyTargetKm: 80,
  routingProfile: 'trekking',
  gpxGeometryLoaded: false,

  // User edits invalidate imported/restored geometry -> BRouter recalculates.
  addWaypoint: (lat, lng) =>
    set((s) => ({
      waypoints: [...s.waypoints, { id: newId(), lat, lng }],
      gpxGeometryLoaded: false,
    })),

  updateWaypoint: (id, lat, lng) =>
    set((s) => ({
      waypoints: s.waypoints.map((w) => (w.id === id ? { ...w, lat, lng } : w)),
      gpxGeometryLoaded: false,
    })),

  removeWaypoint: (id) =>
    set((s) => ({
      waypoints: s.waypoints.filter((w) => w.id !== id),
      gpxGeometryLoaded: false,
    })),

  clearRoute: () =>
    set({ waypoints: [], routeGeometry: null, routeStats: null, daySegments: [], gpxGeometryLoaded: false }),

  setRouteGeometry: (geom) => set({ routeGeometry: geom }),
  setRouteStats: (stats) => set({ routeStats: stats }),
  setIsCalculating: (v) => set({ isCalculating: v }),
  setWaypoints: (wps) => set({ waypoints: wps, gpxGeometryLoaded: false }),
  setDaySegments: (segs) => {
    if (daySegmentsEqual(get().daySegments, segs)) return;
    set({ daySegments: segs });
  },
  setDailyTargetKm: (km) => set({ dailyTargetKm: Math.max(20, Math.min(300, km)) }),
  setRoutingProfile: (p) => set({ routingProfile: p, gpxGeometryLoaded: false }),
  setGpxGeometryLoaded: (v) => set({ gpxGeometryLoaded: v }),
}), {
  name: 'bikepacking-route',
  // Persist the inputs and the computed geometry; day segments, surface and
  // passes are re-derived on load.
  partialize: (s) => ({
    waypoints: s.waypoints,
    routeGeometry: s.routeGeometry,
    routeStats: s.routeStats,
    dailyTargetKm: s.dailyTargetKm,
    routingProfile: s.routingProfile,
  }),
  merge: (persisted, current) => {
    const p = (persisted ?? {}) as Partial<RouteState>;
    // A restored geometry is authoritative: skip the BRouter round-trip on
    // load (and keep the plan usable offline). Same mechanism as GPX import.
    return { ...current, ...p, gpxGeometryLoaded: !!p.routeGeometry };
  },
}));
