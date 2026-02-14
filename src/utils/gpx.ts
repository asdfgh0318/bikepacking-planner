import { gpx } from '@tmcw/togeojson';
import type { Waypoint } from '../types';

export function parseGPX(gpxString: string): {
  waypoints: Waypoint[];
  geometry: GeoJSON.LineString | null;
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxString, 'text/xml');
  const geojson = gpx(doc);

  const waypoints: Waypoint[] = [];
  let geometry: GeoJSON.LineString | null = null;

  for (const feature of geojson.features) {
    if (
      feature.geometry.type === 'LineString' ||
      feature.geometry.type === 'MultiLineString'
    ) {
      // Take the first linestring
      const coords =
        feature.geometry.type === 'MultiLineString'
          ? feature.geometry.coordinates[0]
          : feature.geometry.coordinates;

      geometry = { type: 'LineString', coordinates: coords };

      // Sample waypoints from the track (start, every ~50km, end)
      const totalPoints = coords.length;
      const sampleCount = Math.max(2, Math.min(10, Math.floor(totalPoints / 20)));
      const step = Math.floor(totalPoints / (sampleCount - 1));

      for (let i = 0; i < sampleCount; i++) {
        const idx = Math.min(i * step, totalPoints - 1);
        const [lng, lat] = coords[idx];
        waypoints.push({
          id: `gpx-${i}`,
          lat,
          lng,
        });
      }
    }
  }

  return { waypoints, geometry };
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
