import type { Waypoint } from '../types';

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
    // The result is persisted, so a malformed link must not get through.
    const valid = Array.isArray(data?.w) && data.w.every((c: unknown) =>
      Array.isArray(c) && c.length >= 2 &&
      Number.isFinite(c[0]) && Number.isFinite(c[1]) &&
      Math.abs(c[0]) <= 90 && Math.abs(c[1]) <= 180);
    if (!valid) return null;
    return {
      name: typeof data.n === 'string' && data.n ? data.n : 'Shared Route',
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
