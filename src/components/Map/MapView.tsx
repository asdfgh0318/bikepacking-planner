import { useState, useCallback, useRef } from 'react';
import Map from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import { useRouteStore } from '../../store/routeStore';
import { WaypointMarkers } from './WaypointMarkers';
import { RouteLayer } from './RouteLayer';
import { SupplyMarkers } from './SupplyMarkers';
import { DayMarkers } from './DayMarkers';
import { WeatherMarkers } from './WeatherMarkers';
import 'maplibre-gl/dist/maplibre-gl.css';

// OpenFreeMap — free vector tiles, no API key required
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export function MapView() {
  const addWaypoint = useRouteStore((s) => s.addWaypoint);
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const onLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  return (
    <Map
      ref={mapRef}
      initialViewState={{ latitude: 51.9, longitude: 19.15, zoom: 7 }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={MAP_STYLE}
      cursor="crosshair"
      onLoad={onLoad}
      onClick={(e) => {
        e.preventDefault();
        addWaypoint(e.lngLat.lat, e.lngLat.lng);
      }}
    >
      <RouteLayer mapRef={mapRef} mapLoaded={mapLoaded} />
      <SupplyMarkers />
      <DayMarkers />
      <WeatherMarkers />
      <WaypointMarkers />
    </Map>
  );
}
