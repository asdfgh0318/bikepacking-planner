import { create } from 'zustand';
import type { Waypoint, RouteStats, DaySegment, RoutingProfile } from '../types';
import type { SurfaceSummary } from '../services/surfaceAnalysis';
import type { MountainPass } from '../services/wikidata';

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
  /** Surface quality analysis from Overpass (surface/tracktype tags). */
  surfaceSummary: SurfaceSummary | null;
  /** Mountain passes/saddles from Wikidata, positioned along the route. */
  mountainPasses: MountainPass[];

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
  setSurfaceSummary: (s: SurfaceSummary | null) => void;
  setMountainPasses: (passes: MountainPass[]) => void;
}

let nextId = 1;

export const useRouteStore = create<RouteState>((set) => ({
  waypoints: [],
  routeGeometry: null,
  routeStats: null,
  isCalculating: false,
  daySegments: [],
  dailyTargetKm: 80,
  routingProfile: 'trekking',
  gpxGeometryLoaded: false,
  surfaceSummary: null,
  mountainPasses: [],

  addWaypoint: (lat, lng) =>
    set((s) => ({
      waypoints: [...s.waypoints, { id: String(nextId++), lat, lng }],
    })),

  updateWaypoint: (id, lat, lng) =>
    set((s) => ({
      waypoints: s.waypoints.map((w) => (w.id === id ? { ...w, lat, lng } : w)),
    })),

  removeWaypoint: (id) =>
    set((s) => ({
      waypoints: s.waypoints.filter((w) => w.id !== id),
    })),

  clearRoute: () =>
    set({ waypoints: [], routeGeometry: null, routeStats: null, daySegments: [], gpxGeometryLoaded: false, surfaceSummary: null, mountainPasses: [] }),

  setRouteGeometry: (geom) => set({ routeGeometry: geom }),
  setRouteStats: (stats) => set({ routeStats: stats }),
  setIsCalculating: (v) => set({ isCalculating: v }),
  setWaypoints: (wps) => set({ waypoints: wps }),
  setDaySegments: (segs) => set({ daySegments: segs }),
  setDailyTargetKm: (km) => set({ dailyTargetKm: Math.max(20, Math.min(300, km)) }),
  setRoutingProfile: (p) => set({ routingProfile: p }),
  setGpxGeometryLoaded: (v) => set({ gpxGeometryLoaded: v }),
  setSurfaceSummary: (s) => set({ surfaceSummary: s }),
  setMountainPasses: (passes) => set({ mountainPasses: passes }),
}));
