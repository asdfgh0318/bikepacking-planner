import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { useRouteStore } from '../../store/routeStore';
import type { Difficulty } from '../../types';

const DIFF_COLORS: Record<Difficulty, string> = {
  easy: '#4ade80',
  moderate: '#fbbf24',
  hard: '#f87171',
};

function createDayIcon(dayNum: number, difficulty: Difficulty) {
  const color = DIFF_COLORS[difficulty];
  return L.divIcon({
    className: 'day-marker-wrap',
    html: `<div style="
      width:26px;height:26px;
      background:#0f172a;
      border:2px solid ${color};
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:10px;font-weight:800;color:${color};
      font-family:-apple-system,sans-serif;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
    ">D${dayNum}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

const dayIconCache = new Map<string, L.DivIcon>();
function getDayIcon(dayNum: number, difficulty: Difficulty) {
  const key = `${dayNum}-${difficulty}`;
  if (!dayIconCache.has(key)) {
    dayIconCache.set(key, createDayIcon(dayNum, difficulty));
  }
  return dayIconCache.get(key)!;
}

function formatHours(h: number) {
  return `${Math.floor(h)}h${Math.round((h % 1) * 60).toString().padStart(2, '0')}`;
}

export function DayMarkers() {
  const daySegments = useRouteStore((s) => s.daySegments);

  if (daySegments.length <= 1) return null;

  return (
    <>
      {daySegments.slice(1).map((seg) => (
        <Marker
          key={`day-${seg.dayNumber}`}
          position={[seg.startCoord[1], seg.startCoord[0]]}
          icon={getDayIcon(seg.dayNumber, seg.difficulty)}
          interactive={true}
        >
          <Tooltip direction="top" offset={[0, -16]} opacity={0.95}>
            <span style={{ fontWeight: 600, fontSize: 12 }}>
              Day {seg.dayNumber} — {seg.distanceKm.toFixed(0)} km · {formatHours(seg.estimatedHours)} · {seg.difficulty}
            </span>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}
