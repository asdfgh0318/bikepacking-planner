import * as turf from '@turf/turf';

export function bufferRoute(
  routeGeometry: GeoJSON.LineString,
  corridorWidthKm: number
): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> {
  const line = turf.lineString(routeGeometry.coordinates);
  return turf.buffer(line, corridorWidthKm, { units: 'kilometers' }) as GeoJSON.Feature<
    GeoJSON.Polygon | GeoJSON.MultiPolygon
  >;
}

export function isPointInCorridor(
  lat: number,
  lng: number,
  corridor: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
): boolean {
  const pt = turf.point([lng, lat]);
  return turf.booleanPointInPolygon(pt, corridor);
}

export function getDistanceAlongRoute(
  routeGeometry: GeoJSON.LineString,
  lat: number,
  lng: number
): number {
  const line = turf.lineString(routeGeometry.coordinates);
  const pt = turf.point([lng, lat]);
  const snapped = turf.nearestPointOnLine(line, pt);
  return snapped.properties.location ?? 0; // km from start
}

export function getRouteBounds(routeGeometry: GeoJSON.LineString, paddingKm: number) {
  const line = turf.lineString(routeGeometry.coordinates);
  const bbox = turf.bbox(turf.buffer(line, paddingKm, { units: 'kilometers' })!);
  return {
    south: bbox[1],
    west: bbox[0],
    north: bbox[3],
    east: bbox[2],
  };
}
