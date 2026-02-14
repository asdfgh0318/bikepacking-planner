import { Polyline } from 'react-leaflet';
import { useRouteStore } from '../../store/routeStore';

export function RouteLayer() {
  const routeGeometry = useRouteStore((s) => s.routeGeometry);

  if (!routeGeometry) return null;

  // GeoJSON is [lng, lat], Leaflet needs [lat, lng]
  const positions = routeGeometry.coordinates.map(
    (coord) => [coord[1], coord[0]] as [number, number]
  );

  return (
    <Polyline
      positions={positions}
      pathOptions={{ color: '#e63946', weight: 4, opacity: 0.8 }}
    />
  );
}
