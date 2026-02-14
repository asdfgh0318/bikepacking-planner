import { useCallback } from 'react';
import { useRouteStore } from '../../store/routeStore';
import { parseGPX, readFileAsText } from '../../utils/gpx';

export function GPXImport() {
  const setWaypoints = useRouteStore((s) => s.setWaypoints);
  const setRouteGeometry = useRouteStore((s) => s.setRouteGeometry);
  const setRouteStats = useRouteStore((s) => s.setRouteStats);

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const text = await readFileAsText(file);
        const { waypoints, geometry } = parseGPX(text);

        if (waypoints.length > 0) {
          setWaypoints(waypoints);
        }
        if (geometry) {
          setRouteGeometry(geometry);
          // Approximate stats from geometry
          const coords = geometry.coordinates;
          let dist = 0;
          for (let i = 1; i < coords.length; i++) {
            const [x1, y1] = coords[i - 1];
            const [x2, y2] = coords[i];
            const dx = (x2 - x1) * 111.32 * Math.cos(((y1 + y2) / 2) * (Math.PI / 180));
            const dy = (y2 - y1) * 110.574;
            dist += Math.sqrt(dx * dx + dy * dy);
          }
          setRouteStats({ distanceKm: dist, ascentM: 0, descentM: 0 });
        }
      } catch {
        alert('Failed to parse GPX file');
      }
    },
    [setWaypoints, setRouteGeometry, setRouteStats]
  );

  return (
    <div className="panel">
      <h3>Import GPX</h3>
      <input
        type="file"
        accept=".gpx"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <p className="hint">Upload a .gpx file from Strava, Komoot, etc.</p>
    </div>
  );
}
