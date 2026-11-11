import type { SupplyPoint } from '../../types';

export interface MapView {
  zoom: number;
  west: number;
  south: number;
  east: number;
  north: number;
}

/** Below this zoom the whole route is on screen and minor POIs only add clutter. */
export const MINOR_MIN_ZOOM = 9;

/** Never the only way to resupply, and numerous in any town. */
const MINOR_TYPES: ReadonlySet<SupplyPoint['type']> = new Set([
  'cafe', 'restaurant', 'bakery', 'pharmacy', 'toilets', 'compressed_air', 'bus_stop',
]);

/** Share of the viewport added on each side, so markers don't pop in at the edge of a short pan. */
const PAD = 0.2;

/**
 * The points worth a DOM marker for the current view: inside the padded
 * viewport, and without minor types when zoomed out. Every marker is an
 * element MapLibre repositions on each frame, so the count must stay bounded.
 */
export function cullMarkers<T extends Pick<SupplyPoint, 'lat' | 'lng' | 'type'>>(points: T[], view: MapView | null): T[] {
  if (!view) return points;
  const padLng = (view.east - view.west) * PAD;
  const padLat = (view.north - view.south) * PAD;
  const showMinor = view.zoom >= MINOR_MIN_ZOOM;
  return points.filter((p) =>
    (showMinor || !MINOR_TYPES.has(p.type)) &&
    p.lng >= view.west - padLng && p.lng <= view.east + padLng &&
    p.lat >= view.south - padLat && p.lat <= view.north + padLat);
}
