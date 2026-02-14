import { fetchWithRetry } from '../utils/fetchWithRetry';

export interface InPostPoint {
  name: string;
  type: string[];
  status: string;
  location: { latitude: number; longitude: number };
  address: { line1: string; line2: string };
  opening_hours: string;
  location_247: boolean;
  partner_id: number;
  location_description: string;
}

const INPOST_API = 'https://api-pl-points.easypack24.net/v1/points';

export async function fetchPaczkomaty(
  bounds: { north: number; south: number; east: number; west: number },
  signal?: AbortSignal
): Promise<InPostPoint[]> {
  // InPost API uses relative_point + distance or bounding box via fields
  const url = new URL(INPOST_API);
  url.searchParams.set('per_page', '500');
  url.searchParams.set('status', 'Operating');
  url.searchParams.set('type', 'parcel_locker');
  url.searchParams.set(
    'relative_point',
    `${(bounds.north + bounds.south) / 2},${(bounds.east + bounds.west) / 2}`
  );

  const res = await fetchWithRetry(url.toString(), { signal });
  if (!res.ok) {
    throw new Error(`InPost API error: ${res.status}`);
  }

  const data = await res.json();
  // API returns { items: [...], count, page, ... }
  const rawItems = data?.items ?? data;
  if (!Array.isArray(rawItems)) {
    console.warn('[InPost] Unexpected response structure, expected array or { items: [] }');
    return [];
  }

  // Filter to bounding box, skipping invalid items
  const results: InPostPoint[] = [];
  for (const p of rawItems) {
    try {
      const lat = p?.location?.latitude;
      const lng = p?.location?.longitude;
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) continue;
      if (!p.address || typeof p.address.line1 !== 'string') continue;
      if (lat < bounds.south || lat > bounds.north || lng < bounds.west || lng > bounds.east) continue;
      results.push(p as InPostPoint);
    } catch {
      // Skip malformed item
      continue;
    }
  }
  return results;
}
