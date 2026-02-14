import { create } from 'zustand';
import type { Waypoint, RouteStats } from '../types';

interface RouteState {
  waypoints: Waypoint[];
  routeGeometry: GeoJSON.LineString | null;
  routeStats: RouteStats | null;
  isCalculating: boolean;

  addWaypoint: (lat: number, lng: number) => void;
  updateWaypoint: (id: string, lat: number, lng: number) => void;
  removeWaypoint: (id: string) => void;
  clearRoute: () => void;
  setRouteGeometry: (geom: GeoJSON.LineString | null) => void;
  setRouteStats: (stats: RouteStats | null) => void;
  setIsCalculating: (v: boolean) => void;
  setWaypoints: (wps: Waypoint[]) => void;
}

let nextId = 1;

export const useRouteStore = create<RouteState>((set) => ({
  waypoints: [],
  routeGeometry: null,
  routeStats: null,
  isCalculating: false,

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
    set({ waypoints: [], routeGeometry: null, routeStats: null }),

  setRouteGeometry: (geom) => set({ routeGeometry: geom }),
  setRouteStats: (stats) => set({ routeStats: stats }),
  setIsCalculating: (v) => set({ isCalculating: v }),
  setWaypoints: (wps) => set({ waypoints: wps }),
}));
