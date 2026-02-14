import { Polyline } from 'react-leaflet';
import { useRouteStore } from '../../store/routeStore';

export function RouteLayer() {
  const routeGeometry = useRouteStore((s) => s.routeGeometry);

  if (!routeGeometry) return null;

  const positions = routeGeometry.coordinates.map(
    (coord) => [coord[1], coord[0]] as [number, number]
  );

  return (
    <>
      {/* Route shadow/outline */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: '#000',
          weight: 7,
          opacity: 0.2,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      {/* Main route */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: '#4ade80',
          weight: 4,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </>
  );
}
