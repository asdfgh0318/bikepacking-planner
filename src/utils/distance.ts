/**
 * Fast approximate distance between two WGS-84 points using the equirectangular projection.
 * Accurate to ~0.5% for distances under 100 km at European latitudes.
 */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dx = (lng2 - lng1) * 111.32 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  const dy = (lat2 - lat1) * 110.574;
  return Math.sqrt(dx * dx + dy * dy);
}
