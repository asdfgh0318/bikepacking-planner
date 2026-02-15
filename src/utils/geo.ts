import { lineString, buffer, point, booleanPointInPolygon, nearestPointOnLine, bbox } from '@turf/turf';

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
