import { lineString, length, along } from '@turf/turf';
import { OVERPASS_ROUTE_SAMPLE_POINTS } from '../config';

/**
 * Downsample a route LineString to ~targetCount points, uniformly spaced
 * by distance along the route. Always includes the first and last point.
 * Returns a string formatted for Overpass QL `around` filter: "lat1,lon1,lat2,lon2,..."
 */
export function downsampleRouteForOverpass(
  routeGeometry: GeoJSON.LineString,
  targetCount: number = OVERPASS_ROUTE_SAMPLE_POINTS,
): string {
  const coords = routeGeometry.coordinates;
  if (coords.length <= 2) {
    // Short route — just use start and end
    return coords.map(c => `${c[1].toFixed(5)},${c[0].toFixed(5)}`).join(',');
  }

  const line = lineString(coords);
  const totalLengthKm = length(line, { units: 'kilometers' });

  // Ensure at least 2 points, max targetCount
  const numPoints = Math.min(targetCount, Math.max(2, coords.length));
  const stepKm = totalLengthKm / (numPoints - 1);

  const sampled: [number, number][] = [];

  // Always include first point
  sampled.push([coords[0][1], coords[0][0]]); // [lat, lon]

  // Sample intermediate points at equal distance intervals
  for (let i = 1; i < numPoints - 1; i++) {
    const distKm = i * stepKm;
    const pt = along(line, distKm, { units: 'kilometers' });
    const [lon, lat] = pt.geometry.coordinates;
    sampled.push([lat, lon]);
  }

  // Always include last point
  const last = coords[coords.length - 1];
  sampled.push([last[1], last[0]]);

  return sampled.map(([lat, lon]) => `${lat.toFixed(5)},${lon.toFixed(5)}`).join(',');
}

/**
 * Generate a deterministic hash of a route for cache keying.
 * Uses a subset of coordinates to create a stable identifier.
 */
export function routeHash(routeGeometry: GeoJSON.LineString): string {
  const coords = routeGeometry.coordinates;
  // Sample ~10 points for the hash to keep it fast
  const step = Math.max(1, Math.floor(coords.length / 10));
  const sampled = coords.filter((_, i) => i % step === 0 || i === coords.length - 1);
  const str = sampled.map(c => `${c[0].toFixed(4)},${c[1].toFixed(4)}`).join('|');

  // Simple hash function (djb2)
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return hash.toString(36);
}
