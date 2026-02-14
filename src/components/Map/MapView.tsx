import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { useRouteStore } from '../../store/routeStore';
import { WaypointMarkers } from './WaypointMarkers';
import { RouteLayer } from './RouteLayer';
import { SupplyMarkers } from './SupplyMarkers';
import 'leaflet/dist/leaflet.css';

function MapClickHandler() {
  const addWaypoint = useRouteStore((s) => s.addWaypoint);

  useMapEvents({
    click(e) {
      addWaypoint(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

export function MapView() {
  return (
    <MapContainer
      center={[51.9, 19.15]}
      zoom={7}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler />
      <WaypointMarkers />
      <RouteLayer />
      <SupplyMarkers />
    </MapContainer>
  );
}
