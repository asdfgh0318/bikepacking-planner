import { gpx } from '@tmcw/togeojson';
import type { Waypoint } from '../types';

export function parseGPX(gpxString: string): {
  waypoints: Waypoint[];
  geometry: GeoJSON.LineString | null;
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxString, 'text/xml');
  const geojson = gpx(doc);

  // One route line: every segment of every track, in document order. A
  // file may hold one track per day, or a recording split by pauses. Routes
  // (<rte>) are used only when the file has no tracks, so a file carrying
  // both forms of the same path is not doubled.
  const lines = geojson.features.filter(
    (f) => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString',
  );
  const tracks = lines.filter((f) => f.properties?._gpxType === 'trk');
  const coords: GeoJSON.Position[] = [];
  for (const feature of tracks.length > 0 ? tracks : lines) {
    const g = feature.geometry;
    if (g.type === 'LineString') coords.push(...g.coordinates);
    else if (g.type === 'MultiLineString') for (const seg of g.coordinates) coords.push(...seg);
  }
  if (coords.length < 2) return { waypoints: [], geometry: null };

  return { waypoints: sampleWaypoints(coords), geometry: { type: 'LineString', coordinates: thinTrack(coords) } };
}

/**
 * A 1 Hz multi-day recording runs to hundreds of thousands of points: more
 * than localStorage holds and far more than the plan or the map can use.
 */
export const MAX_TRACK_POINTS = 5000;

/** Evenly thin a track to at most `max` points, keeping the first and last. */
export function thinTrack(coords: GeoJSON.Position[], max = MAX_TRACK_POINTS): GeoJSON.Position[] {
  if (coords.length <= max) return coords;
  const out: GeoJSON.Position[] = [];
  for (let i = 0; i < max; i++) out.push(coords[Math.round((i * (coords.length - 1)) / (max - 1))]);
  return out;
}

function sampleWaypoints(coords: GeoJSON.Position[]): Waypoint[] {

  // Sample waypoints evenly by index; first and last point always included.
  const n = coords.length;
  const sampleCount = Math.max(2, Math.min(10, Math.floor(n / 20)));
  const waypoints: Waypoint[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const [lng, lat] = coords[Math.round((i * (n - 1)) / (sampleCount - 1))];
    waypoints.push({ id: `gpx-${i}`, lat, lng });
  }
  return waypoints;
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Export route + supply points as GPX file.
 */
export function exportGPX(
  routeName: string,
  routeGeometry: GeoJSON.LineString,
  supplyPoints?: { name: string; lat: number; lng: number; type: string; distanceFromStartKm: number }[]
): string {
  const now = new Date().toISOString();

  let gpxStr = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Bikepacking Planner"
  xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(routeName)}</name>
    <time>${now}</time>
  </metadata>
`;

  // Add supply points as waypoints
  if (supplyPoints) {
    for (const sp of supplyPoints) {
      gpxStr += `  <wpt lat="${sp.lat}" lon="${sp.lng}">
    <name>${escapeXml(sp.name)}</name>
    <desc>${escapeXml(sp.type)} at ${sp.distanceFromStartKm.toFixed(1)} km</desc>
    <sym>${sp.type === 'water' ? 'Water Source' : sp.type === 'paczkomat' ? 'Box' : 'Shopping Center'}</sym>
  </wpt>
`;
    }
  }

  // Add route as track
  gpxStr += `  <trk>
    <name>${escapeXml(routeName)}</name>
    <trkseg>
`;

  for (const coord of routeGeometry.coordinates) {
    const [lng, lat, ele] = coord;
    if (ele != null) {
      gpxStr += `      <trkpt lat="${lat}" lon="${lng}"><ele>${ele.toFixed(1)}</ele></trkpt>\n`;
    } else {
      gpxStr += `      <trkpt lat="${lat}" lon="${lng}"/>\n`;
    }
  }

  gpxStr += `    </trkseg>
  </trk>
</gpx>`;

  return gpxStr;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function downloadGPX(filename: string, gpxContent: string) {
  const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.gpx') ? filename : `${filename}.gpx`;
  a.click();
  URL.revokeObjectURL(url);
}
