import type { Waypoint, RouteStats } from '../types';

const STORAGE_KEY = 'bikepacking-saved-routes';

export interface SavedRoute {
  id: string;
  name: string;
  savedAt: string;
  waypoints: Waypoint[];
  routeStats: RouteStats | null;
  dailyTargetKm: number;
  corridorWidthKm: number;
}

export function getSavedRoutes(): SavedRoute[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRoute(route: Omit<SavedRoute, 'id' | 'savedAt'>): SavedRoute {
  const routes = getSavedRoutes();
  const saved: SavedRoute = {
    ...route,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    savedAt: new Date().toISOString(),
  };
  routes.unshift(saved);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
  return saved;
}

export function deleteRoute(id: string) {
  const routes = getSavedRoutes().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
}

/**
 * Encode route waypoints into a URL-safe string for sharing.
 * Format: base64 encoded JSON of waypoints + name.
 */
export function encodeRouteToHash(name: string, waypoints: Waypoint[]): string {
  const data = {
    n: name,
    w: waypoints.map((wp) => [Math.round(wp.lat * 1e5) / 1e5, Math.round(wp.lng * 1e5) / 1e5]),
  };
  return btoa(JSON.stringify(data));
}

export function decodeRouteFromHash(hash: string): { name: string; waypoints: Waypoint[] } | null {
  try {
    const data = JSON.parse(atob(hash));
    return {
      name: data.n || 'Shared Route',
      waypoints: (data.w as number[][]).map((coords, i) => ({
        id: `shared-${i}`,
        lat: coords[0],
        lng: coords[1],
      })),
    };
  } catch {
    return null;
  }
}
