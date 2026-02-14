import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useRouteStore } from '../../store/routeStore';
import { useMemo } from 'react';

function createNumberedIcon(index: number) {
  return L.divIcon({
    className: 'waypoint-marker',
    html: `<div class="waypoint-icon">${index + 1}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function WaypointMarkers() {
  const waypoints = useRouteStore((s) => s.waypoints);
  const updateWaypoint = useRouteStore((s) => s.updateWaypoint);
  const removeWaypoint = useRouteStore((s) => s.removeWaypoint);

  const icons = useMemo(
    () => waypoints.map((_, i) => createNumberedIcon(i)),
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
          <Popup>
            <strong>Waypoint {i + 1}</strong>
            <br />
            {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
            <br />
            <button
              onClick={() => removeWaypoint(wp.id)}
              style={{ marginTop: 4, cursor: 'pointer' }}
            >
              Remove
            </button>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
