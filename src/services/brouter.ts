import type { RouteStats } from '../types';

const BROUTER_API = 'https://brouter.de/brouter';

interface BRouterResponse {
  features: Array<{
    geometry: GeoJSON.LineString;
    properties: {
      'track-length'?: string;
      'total-ascend'?: string;
      'total-descend'?: string;
      [key: string]: unknown;
    };
  }>;
}

export async function calculateRoute(
  waypoints: Array<{ lat: number; lng: number }>
): Promise<{ geometry: GeoJSON.LineString; stats: RouteStats }> {
  if (waypoints.length < 2) {
    throw new Error('Need at least 2 waypoints');
  }

  const lonlats = waypoints.map((w) => `${w.lng},${w.lat}`).join('|');

  const params = new URLSearchParams({
    lonlats,
    profile: 'trekking',
    alternativeidx: '0',
    format: 'geojson',
  });

  const res = await fetch(`${BROUTER_API}?${params}`);
  if (!res.ok) {
    throw new Error(`BRouter error: ${res.status}`);
  }

  const data: BRouterResponse = await res.json();
  const feature = data.features[0];

  const stats: RouteStats = {
    distanceKm: Number(feature.properties['track-length'] || 0) / 1000,
    ascentM: Number(feature.properties['total-ascend'] || 0),
    descentM: Number(feature.properties['total-descend'] || 0),
  };

  return { geometry: feature.geometry, stats };
}
