import { useState, useCallback } from 'react';
import { Marker, Popup } from 'react-map-gl/maplibre';
import { useRouteStore } from '../../store/routeStore';

export function WaypointMarkers() {
  const waypoints = useRouteStore((s) => s.waypoints);
  const updateWaypoint = useRouteStore((s) => s.updateWaypoint);
  const removeWaypoint = useRouteStore((s) => s.removeWaypoint);
  const [popupId, setPopupId] = useState<string | null>(null);

  const handleDragEnd = useCallback(
    (id: string, e: { lngLat: { lat: number; lng: number } }) => {
      updateWaypoint(id, e.lngLat.lat, e.lngLat.lng);
    },
    [updateWaypoint]
  );

  return (
    <>
      {waypoints.map((wp, i) => {
        const isStart = i === 0;
        const isEnd = i === waypoints.length - 1 && waypoints.length > 1;
        const color = isStart ? '#4ade80' : isEnd ? '#f87171' : '#ffffff';
        const textColor = isStart || isEnd ? '#fff' : '#1e293b';
        const label = isStart ? 'A' : isEnd ? 'B' : String(i + 1);
        const size = isStart || isEnd ? 32 : 26;

        return (
          <Marker
            key={wp.id}
            latitude={wp.lat}
            longitude={wp.lng}
            draggable
            onDragEnd={(e) => handleDragEnd(wp.id, e)}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setPopupId(popupId === wp.id ? null : wp.id);
            }}
            anchor="center"
          >
            <div
              className="waypoint-marker"
              style={{
                width: size,
                height: size,
                background: color,
                color: textColor,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isStart || isEnd ? 14 : 11,
                fontWeight: 700,
                border: '3px solid #fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                cursor: 'grab',
              }}
            >
              {label}
            </div>
          </Marker>
        );
      })}
      {popupId && (() => {
        const wp = waypoints.find((w) => w.id === popupId);
        const i = waypoints.findIndex((w) => w.id === popupId);
        if (!wp) return null;
        return (
          <Popup
            latitude={wp.lat}
            longitude={wp.lng}
            onClose={() => setPopupId(null)}
            closeOnClick={false}
            offset={20}
            className="custom-popup"
          >
            <div style={{ fontFamily: '-apple-system, sans-serif' }}>
              <strong>Waypoint {i + 1}</strong>
              <br />
              <span style={{ color: '#666', fontSize: 12 }}>
                {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
              </span>
              <br />
              <button
                onClick={() => {
                  removeWaypoint(wp.id);
                  setPopupId(null);
                }}
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
        );
      })()}
    </>
  );
}
