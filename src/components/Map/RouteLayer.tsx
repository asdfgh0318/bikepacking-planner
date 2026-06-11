import { useEffect, type RefObject } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import { useRouteStore } from '../../store/routeStore';

const SOURCE_ID = 'route-source';
const SHADOW_LAYER_ID = 'route-shadow';
const MAIN_LAYER_ID = 'route-main';

interface Props {
  mapRef: RefObject<MapRef | null>;
  mapLoaded: boolean;
}

export function RouteLayer({ mapRef, mapLoaded }: Props) {
  const routeGeometry = useRouteStore((s) => s.routeGeometry);

  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: routeGeometry
        ? [{
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: routeGeometry.coordinates.map((c) => [c[0], c[1]]),
            },
            properties: {},
          }]
        : [],
    };

    // If source already exists, just update data
    const existing = map.getSource(SOURCE_ID);
    if (existing && 'setData' in existing) {
      (existing as maplibregl.GeoJSONSource).setData(geojson);
      return;
    }

    // First time: add source + layers
    map.addSource(SOURCE_ID, { type: 'geojson', data: geojson });
    map.addLayer({
      id: SHADOW_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': '#000', 'line-width': 7, 'line-opacity': 0.2 },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    });
    map.addLayer({
      id: MAIN_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': '#ef4444', 'line-width': 4, 'line-opacity': 0.9 },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    });
  }, [mapRef, mapLoaded, routeGeometry]);

  // Cleanup on unmount — capture the map instance when the effect runs,
  // not via the ref at teardown time (the ref may already be cleared)
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    return () => {
      try {
        if (map.getLayer(MAIN_LAYER_ID)) map.removeLayer(MAIN_LAYER_ID);
        if (map.getLayer(SHADOW_LAYER_ID)) map.removeLayer(SHADOW_LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        // map may already be destroyed
      }
    };
  }, [mapRef, mapLoaded]);

  return null;
}
