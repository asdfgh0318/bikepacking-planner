import { useState } from 'react';
import { Marker, Popup } from 'react-map-gl/maplibre';
import { useRouteStore } from '../../store/routeStore';
import { formatHours } from '../../utils/format';
import type { Difficulty } from '../../types';

const DIFF_COLORS: Record<Difficulty, string> = {
  easy: '#4ade80',
  moderate: '#fbbf24',
  hard: '#f87171',
};

export function DayMarkers() {
  const daySegments = useRouteStore((s) => s.daySegments);
  const [openDay, setOpenDay] = useState<number | null>(null);

  if (daySegments.length <= 1) return null;

  const open = daySegments.find((s) => s.dayNumber === openDay && s.dayNumber > 1);

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
            // Without this the tap reaches the map and adds a waypoint.
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setOpenDay(openDay === seg.dayNumber ? null : seg.dayNumber);
            }}
          >
            <div
              className="day-marker"
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
                cursor: 'pointer',
              }}
            >
              D{seg.dayNumber}
            </div>
          </Marker>
        );
      })}
      {open && (
        <Popup latitude={open.startCoord[1]} longitude={open.startCoord[0]} onClose={() => setOpenDay(null)} closeOnClick={false} offset={16} className="custom-popup">
          <div className="popup">
            <strong>Day {open.dayNumber}</strong>
            <div className="popup-line">{open.distanceKm.toFixed(0)} km · {formatHours(open.estimatedHours)} · {open.difficulty}</div>
          </div>
        </Popup>
      )}
    </>
  );
}
