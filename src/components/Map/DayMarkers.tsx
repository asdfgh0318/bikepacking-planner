import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { useRouteStore } from '../../store/routeStore';

function createDayIcon(dayNum: number) {
  return L.divIcon({
    className: 'day-marker-wrap',
    html: `<div style="
      width:26px;height:26px;
      background:#0f172a;
      border:2px solid #4ade80;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:10px;font-weight:800;color:#4ade80;
      font-family:-apple-system,sans-serif;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
    ">D${dayNum}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

const dayIconCache = new Map<number, L.DivIcon>();
function getDayIcon(dayNum: number) {
  if (!dayIconCache.has(dayNum)) {
    dayIconCache.set(dayNum, createDayIcon(dayNum));
  }
  return dayIconCache.get(dayNum)!;
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
          icon={getDayIcon(seg.dayNumber)}
          interactive={true}
        >
          <Tooltip direction="top" offset={[0, -16]} opacity={0.95}>
            <span style={{ fontWeight: 600, fontSize: 12 }}>
              Day {seg.dayNumber} start — {seg.distanceKm.toFixed(0)} km
            </span>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}
