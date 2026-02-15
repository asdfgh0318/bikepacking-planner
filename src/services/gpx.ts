/**
 * GPX import/export service.
 *
 * parseGpxToWaypoints  -- extracts track or route points from a GPX string.
 * exportRouteToGpx     -- generates a GPX XML string from waypoints / route geometry.
 */

import { MAX_GPX_WAYPOINTS } from '../config';

/* ------------------------------------------------------------------ */
/*  Import                                                            */
/* ------------------------------------------------------------------ */

export function parseGpxToWaypoints(
  gpxString: string,
): Array<{ lat: number; lng: number }> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxString, 'text/xml');

  // Prefer <trkpt> (track points); fall back to <rtept> (route points).
  let points = doc.getElementsByTagName('trkpt');
  if (points.length === 0) {
    points = doc.getElementsByTagName('rtept');
  }

  if (points.length === 0) {
    return [];
  }

  // Extract all coordinates.
  const all: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i < points.length; i++) {
    const el = points[i];
    const lat = parseFloat(el.getAttribute('lat') ?? '');
    const lon = parseFloat(el.getAttribute('lon') ?? '');
    if (!isNaN(lat) && !isNaN(lon)) {
      all.push({ lat, lng: lon });
    }
  }

  // Simplify to at most MAX_GPX_WAYPOINTS by taking every Nth point, always
  // keeping the first and last.
  if (all.length <= MAX_GPX_WAYPOINTS) {
    return all;
  }

  const step = (all.length - 1) / (MAX_GPX_WAYPOINTS - 1);
  const sampled: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i < MAX_GPX_WAYPOINTS; i++) {
    const idx = Math.min(Math.round(i * step), all.length - 1);
    sampled.push(all[idx]);
  }
  return sampled;
}

/* ------------------------------------------------------------------ */
/*  Export                                                             */
/* ------------------------------------------------------------------ */

export function exportRouteToGpx(
  waypoints: Array<{ lat: number; lng: number }>,
  routeGeometry: GeoJSON.LineString | null,
  name?: string,
): string {
  const routeName = escapeXml(name ?? 'Bikepacking Route');
  const now = new Date().toISOString();

  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Bikepacking Planner"
  xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${routeName}</name>
    <time>${now}</time>
  </metadata>
  <trk>
    <name>${routeName}</name>
    <trkseg>
`;

  // If a routed geometry is available, use its detailed coordinates;
  // otherwise fall back to the raw waypoints.
  if (routeGeometry && routeGeometry.coordinates.length > 0) {
    for (const coord of routeGeometry.coordinates) {
      const [lng, lat, ele] = coord;
      if (ele != null) {
        gpx += `      <trkpt lat="${lat}" lon="${lng}"><ele>${ele.toFixed(1)}</ele></trkpt>\n`;
      } else {
        gpx += `      <trkpt lat="${lat}" lon="${lng}"/>\n`;
      }
    }
  } else {
    for (const wp of waypoints) {
      gpx += `      <trkpt lat="${wp.lat}" lon="${wp.lng}"/>\n`;
    }
  }

  gpx += `    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
