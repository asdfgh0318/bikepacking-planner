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
