import { distanceKm as distanceKm_ } from './distance';

const EARTH_RADIUS_KM = 6371.0088; // same sphere turf uses, so km match the day splitter
const RAD = Math.PI / 180;

function haversineKm(a: GeoJSON.Position, b: GeoJSON.Position): number {
  const dLat = (b[1] - a[1]) * RAD;
  const dLng = (b[0] - a[0]) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Route km at each vertex, computed once per geometry object. */
const cumulativeCache = new WeakMap<GeoJSON.LineString, Float64Array>();
function cumulativeKm(route: GeoJSON.LineString): Float64Array {
  let cum = cumulativeCache.get(route);
  if (!cum) {
    const c = route.coordinates;
    cum = new Float64Array(c.length);
    for (let i = 1; i < c.length; i++) cum[i] = cum[i - 1] + haversineKm(c[i - 1], c[i]);
    cumulativeCache.set(route, cum);
  }
  return cum;
}

/**
 * Nearest point on the route: how far off it the point lies and how far along
 * it. One pass of flat-earth arithmetic centred on the point — exact enough
 * for anything near the route, and far-off segments only need to lose. This
 * runs per POI (thousands of lockers on a city route), where turf's
 * nearestPointOnLine cost ~15 ms a call on a long line.
 */
export function projectOnRoute(
  routeGeometry: GeoJSON.LineString,
  lat: number,
  lng: number
): { distKm: number; alongKm: number } {
  const c = routeGeometry.coordinates;
  if (c.length === 0) return { distKm: Infinity, alongKm: 0 };
  const cum = cumulativeKm(routeGeometry);
  const kx = EARTH_RADIUS_KM * RAD * Math.cos(lat * RAD);
  const ky = EARTH_RADIUS_KM * RAD;

  let ax = (c[0][0] - lng) * kx;
  let ay = (c[0][1] - lat) * ky;
  let best = ax * ax + ay * ay;
  let alongKm = 0;
  for (let i = 1; i < c.length; i++) {
    const bx = (c[i][0] - lng) * kx;
    const by = (c[i][1] - lat) * ky;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
    const px = ax + t * dx;
    const py = ay + t * dy;
    const d2 = px * px + py * py;
    if (d2 < best) {
      best = d2;
      alongKm = cum[i - 1] + t * (cum[i] - cum[i - 1]);
    }
    ax = bx;
    ay = by;
  }
  return { distKm: Math.sqrt(best), alongKm };
}

export function getDistanceAlongRoute(routeGeometry: GeoJSON.LineString, lat: number, lng: number): number {
  return projectOnRoute(routeGeometry, lat, lng).alongKm; // km from start
}

/**
 * Distance, ascent and descent from a line's coordinates. Elevation is the
 * optional third coordinate; segments without it contribute distance only.
 */
export function lineStats(coords: GeoJSON.Position[]): { distanceKm: number; ascentM: number; descentM: number } {
  let distanceKm = 0;
  let ascentM = 0;
  let descentM = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lng1, lat1, z1] = coords[i - 1];
    const [lng2, lat2, z2] = coords[i];
    distanceKm += distanceKm_(lat1, lng1, lat2, lng2);
    if (z1 != null && z2 != null) {
      const diff = z2 - z1;
      if (diff > 0) ascentM += diff;
      else descentM -= diff;
    }
  }
  return { distanceKm, ascentM, descentM };
}
