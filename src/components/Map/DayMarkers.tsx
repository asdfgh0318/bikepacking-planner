import { Marker } from 'react-map-gl/maplibre';
import { useRouteStore } from '../../store/routeStore';
import type { Difficulty } from '../../types';

const DIFF_COLORS: Record<Difficulty, string> = {
  easy: '#4ade80',
  moderate: '#fbbf24',
  hard: '#f87171',
};

function formatHours(h: number) {
  return `${Math.floor(h)}h${Math.round((h % 1) * 60).toString().padStart(2, '0')}`;
}

export function DayMarkers() {
  const daySegments = useRouteStore((s) => s.daySegments);

  if (daySegments.length <= 1) return null;

  return (
    <>
      {daySegments.slice(1).map((seg) => {
        const color = DIFF_COLORS[seg.difficulty];
        return (
          <Marker
            key={`day-${seg.dayNumber}`}
            latitude={seg.startCoord[1]}
            longitude={seg.startCoord[0]}
            anchor="center"
          >
            <div
              className="day-marker"
              title={`Day ${seg.dayNumber} — ${seg.distanceKm.toFixed(0)} km · ${formatHours(seg.estimatedHours)} · ${seg.difficulty}`}
              style={{
                width: 26,
                height: 26,
                background: '#0f172a',
                border: `2px solid ${color}`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 800,
                color,
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
              }}
            >
              D{seg.dayNumber}
            </div>
          </Marker>
        );
      })}
    </>
  );
}
