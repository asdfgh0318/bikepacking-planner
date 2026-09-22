import { lineString, buffer, point, booleanPointInPolygon, nearestPointOnLine, bbox } from '@turf/turf';
import { distanceKm as distanceKm_ } from './distance';

export function bufferRoute(
  routeGeometry: GeoJSON.LineString,
  corridorWidthKm: number
): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> {
  const line = lineString(routeGeometry.coordinates);
  return buffer(line, corridorWidthKm, { units: 'kilometers' }) as GeoJSON.Feature<
    GeoJSON.Polygon | GeoJSON.MultiPolygon
  >;
}

export function isPointInCorridor(
  lat: number,
  lng: number,
  corridor: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
): boolean {
  const pt = point([lng, lat]);
  return booleanPointInPolygon(pt, corridor);
}

export function getDistanceAlongRoute(
  routeGeometry: GeoJSON.LineString,
  lat: number,
  lng: number
): number {
  const line = lineString(routeGeometry.coordinates);
  const pt = point([lng, lat]);
  const snapped = nearestPointOnLine(line, pt);
  return snapped.properties.location ?? 0; // km from start
}

export function getDistanceToRoute(
  routeGeometry: GeoJSON.LineString,
  lat: number,
  lng: number
): number {
  const line = lineString(routeGeometry.coordinates);
  const pt = point([lng, lat]);
  const snapped = nearestPointOnLine(line, pt);
  return snapped.properties.dist ?? Infinity; // km from route
}

export function getRouteBounds(routeGeometry: GeoJSON.LineString, paddingKm: number) {
  const line = lineString(routeGeometry.coordinates);
  const bounds = bbox(buffer(line, paddingKm, { units: 'kilometers' })!);
  return {
    south: bounds[1],
    west: bounds[0],
    north: bounds[3],
    east: bounds[2],
  };
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
