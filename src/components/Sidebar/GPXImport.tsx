import { useCallback, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useRouteStore } from '../../store/routeStore';
import { parseGPX, readFileAsText } from '../../utils/gpx';
import { distanceKm } from '../../utils/distance';

export function GPXImport() {
  const setWaypoints = useRouteStore((s) => s.setWaypoints);
  const setRouteGeometry = useRouteStore((s) => s.setRouteGeometry);
  const setRouteStats = useRouteStore((s) => s.setRouteStats);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
          const coords = geometry.coordinates;
          let dist = 0;
          let ascent = 0;
          let descent = 0;
          for (let i = 1; i < coords.length; i++) {
            const [lng1, lat1, z1] = coords[i - 1];
            const [lng2, lat2, z2] = coords[i];
            dist += distanceKm(lat1, lng1, lat2, lng2);
            if (z1 != null && z2 != null) {
              const diff = z2 - z1;
              if (diff > 0) ascent += diff;
              else descent += Math.abs(diff);
            }
          }
          setRouteStats({ distanceKm: dist, ascentM: ascent, descentM: descent });
        }
        toast.success('GPX imported', { description: `${waypoints.length} waypoints loaded` });
      } catch {
        toast.error('Failed to parse GPX file', { description: 'Check the file format and try again' });
      }
    },
    [setWaypoints, setRouteGeometry, setRouteStats]
  );

  return (
    <div className="panel">
      <div className="section-label">Import</div>
      <div
        className={`gpx-drop ${dragOver ? 'dragover' : ''}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        <Upload size={28} strokeWidth={1.5} opacity={0.4} />
        <p>Drop GPX file or click to browse</p>
        <p className="hint">Strava, Komoot, Garmin...</p>
        <input
          ref={fileRef}
          type="file"
          accept=".gpx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
    </div>
  );
}
