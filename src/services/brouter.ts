import type { RouteStats, RoutingProfile } from '../types';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { BROUTER_TIMEOUT_MS } from '../config';

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
  waypoints: Array<{ lat: number; lng: number }>,
  profile: RoutingProfile = 'trekking',
  signal?: AbortSignal
): Promise<{ geometry: GeoJSON.LineString; stats: RouteStats }> {
  if (waypoints.length < 2) {
    throw new Error('Need at least 2 waypoints');
  }

  // Round to 6 decimal places — BRouter doesn't need more precision
  const lonlats = waypoints.map((w) => `${w.lng.toFixed(6)},${w.lat.toFixed(6)}`).join('|');

  const params = new URLSearchParams({
    lonlats,
    profile,
    alternativeidx: '0',
    format: 'geojson',
  });

  const res = await fetchWithRetry(`${BROUTER_API}?${params}`, { signal, timeout: BROUTER_TIMEOUT_MS });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (body.includes('not mapped')) {
      throw new Error('Waypoint is too far from any road. Try moving it closer to a road.');
    }
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
