import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useRouteStore } from '../../store/routeStore';
import { useMemo } from 'react';

function createWaypointIcon(index: number, total: number) {
  const isStart = index === 0;
  const isEnd = index === total - 1 && total > 1;
  const color = isStart ? '#4ade80' : isEnd ? '#f87171' : '#ffffff';
  const textColor = isStart || isEnd ? '#fff' : '#1e293b';
  const label = isStart ? 'A' : isEnd ? 'B' : String(index + 1);
  const size = isStart || isEnd ? 32 : 26;

  return L.divIcon({
    className: 'waypoint-marker-wrap',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      color:${textColor};
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:${isStart || isEnd ? 14 : 11}px;
      font-weight:700;
      border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      font-family:-apple-system,sans-serif;
    ">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function WaypointMarkers() {
  const waypoints = useRouteStore((s) => s.waypoints);
  const updateWaypoint = useRouteStore((s) => s.updateWaypoint);
  const removeWaypoint = useRouteStore((s) => s.removeWaypoint);

  const icons = useMemo(
    () => waypoints.map((_, i) => createWaypointIcon(i, waypoints.length)),
    [waypoints.length]
  );

  return (
    <>
      {waypoints.map((wp, i) => (
        <Marker
          key={wp.id}
          position={[wp.lat, wp.lng]}
          icon={icons[i]}
          draggable
          eventHandlers={{
            dragend(e) {
              const marker = e.target;
              const pos = marker.getLatLng();
              updateWaypoint(wp.id, pos.lat, pos.lng);
            },
          }}
        >
          <Popup className="custom-popup">
            <div style={{ fontFamily: '-apple-system, sans-serif' }}>
              <strong>Waypoint {i + 1}</strong>
              <br />
              <span style={{ color: '#666', fontSize: '12px' }}>
                {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
              </span>
              <br />
              <button
                onClick={() => removeWaypoint(wp.id)}
                style={{
                  marginTop: 6,
                  cursor: 'pointer',
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Remove
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
