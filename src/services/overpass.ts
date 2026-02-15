import { fetchWithRetry } from '../utils/fetchWithRetry';
import { OVERPASS_TIMEOUT_MS, OVERPASS_QUERY_TIMEOUT_S } from '../config';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

interface OverpassElement {
  type: string;
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

export interface ShopPoint {
  id: number;
  lat: number;
  lng: number;
  name: string;
  brand: string;
  openingHours?: string;
}

export async function fetchShopsNearBbox(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}, signal?: AbortSignal): Promise<ShopPoint[]> {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

  // Query Żabka and Biedronka using brand:wikidata for reliability
  const query = `
    [out:json][timeout:${OVERPASS_QUERY_TIMEOUT_S}];
    (
      node["brand:wikidata"="Q2874810"](${bbox});
      node["brand:wikidata"="Q857855"](${bbox});
    );
    out center;
  `;

  const res = await fetchWithRetry(OVERPASS_API, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal,
    timeout: OVERPASS_TIMEOUT_MS,
  });

  if (!res.ok) {
    throw new Error(`Overpass error: ${res.status}`);
  }

  const data = await res.json();
  const elements: OverpassElement[] = data?.elements ?? [];
  const results: ShopPoint[] = [];
  for (const el of elements) {
    try {
      if (typeof el.lat !== 'number' || typeof el.lon !== 'number' || isNaN(el.lat) || isNaN(el.lon)) continue;
      results.push({
        id: el.id,
        lat: el.lat,
        lng: el.lon,
        name: el.tags?.name || el.tags?.brand || 'Shop',
        brand: el.tags?.brand || 'unknown',
        openingHours: el.tags?.opening_hours,
      });
    } catch {
      // Skip malformed element
      continue;
    }
  }
  return results;
}

export interface WaterPoint {
  id: number;
  lat: number;
  lng: number;
  name: string;
  waterType: 'spring' | 'drinking_water' | 'fountain' | 'tap' | 'stream';
}

export async function fetchWaterSourcesNearBbox(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}, signal?: AbortSignal): Promise<WaterPoint[]> {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

  const query = `
    [out:json][timeout:${OVERPASS_QUERY_TIMEOUT_S}];
    (
      node["natural"="spring"](${bbox});
      node["amenity"="drinking_water"](${bbox});
      node["amenity"="fountain"]["drinking_water"="yes"](${bbox});
      node["man_made"="water_tap"](${bbox});
    );
    out center;
  `;

  const res = await fetchWithRetry(OVERPASS_API, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal,
    timeout: OVERPASS_TIMEOUT_MS,
  });

  if (!res.ok) {
    throw new Error(`Overpass error: ${res.status}`);
  }

  const data = await res.json();
  const elements: OverpassElement[] = data?.elements ?? [];
  const results: WaterPoint[] = [];
  for (const el of elements) {
    try {
      if (typeof el.lat !== 'number' || typeof el.lon !== 'number' || isNaN(el.lat) || isNaN(el.lon)) continue;

      let waterType: WaterPoint['waterType'] = 'drinking_water';
      if (el.tags?.natural === 'spring') waterType = 'spring';
      else if (el.tags?.amenity === 'fountain') waterType = 'fountain';
      else if (el.tags?.man_made === 'water_tap') waterType = 'tap';

      results.push({
        id: el.id,
        lat: el.lat,
        lng: el.lon,
        name: el.tags?.name || waterType.replace('_', ' '),
        waterType,
      });
    } catch {
      // Skip malformed element
      continue;
    }
  }
  return results;
}

export interface CampsitePoint {
  id: number;
  lat: number;
  lng: number;
  name: string;
  campsiteType: 'camp_site' | 'shelter' | 'wilderness_hut' | 'bivouac';
  capacity?: string;
  fee: boolean;
  openingHours?: string;
}

export async function fetchCampsitesNearBbox(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}, signal?: AbortSignal): Promise<CampsitePoint[]> {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

  const query = `
    [out:json][timeout:${OVERPASS_QUERY_TIMEOUT_S}];
    (
      node["tourism"="camp_site"](${bbox});
      way["tourism"="camp_site"](${bbox});
      node["tourism"="wilderness_hut"](${bbox});
      way["tourism"="wilderness_hut"](${bbox});
      node["amenity"="shelter"](${bbox});
      way["amenity"="shelter"](${bbox});
      node["camp_site"="bivouac"](${bbox});
    );
    out center;
  `;

  const res = await fetchWithRetry(OVERPASS_API, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal,
    timeout: OVERPASS_TIMEOUT_MS,
  });

  if (!res.ok) {
    throw new Error(`Overpass error: ${res.status}`);
  }

  const data = await res.json();
  const elements: OverpassElement[] = data?.elements ?? [];
  const results: CampsitePoint[] = [];
  for (const el of elements) {
    try {
      // For way elements, use center coordinates
      const lat = el.lat || (el as any).center?.lat;
      const lon = el.lon || (el as any).center?.lon;
      if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) continue;

      let campsiteType: CampsitePoint['campsiteType'] = 'camp_site';
      if (el.tags?.tourism === 'wilderness_hut') campsiteType = 'wilderness_hut';
      else if (el.tags?.amenity === 'shelter') campsiteType = 'shelter';
      else if (el.tags?.camp_site === 'bivouac') campsiteType = 'bivouac';

      const label = campsiteType === 'camp_site' ? 'Campsite'
        : campsiteType === 'wilderness_hut' ? 'Wilderness hut'
        : campsiteType === 'shelter' ? 'Shelter'
        : 'Bivouac';

      results.push({
        id: el.id,
        lat,
        lng: lon,
        name: el.tags?.name || label,
        campsiteType,
        capacity: el.tags?.capacity,
        fee: el.tags?.fee !== 'no',
        openingHours: el.tags?.opening_hours,
      });
    } catch {
      // Skip malformed element
      continue;
    }
  }
  return results;
}

export interface RepairPoint {
  id: number;
  lat: number;
  lng: number;
  name: string;
  repairType: 'shop' | 'repair_station';
  phone?: string;
  openingHours?: string;
}

export async function fetchRepairShopsNearBbox(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}, signal?: AbortSignal): Promise<RepairPoint[]> {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

  const query = `
    [out:json][timeout:${OVERPASS_QUERY_TIMEOUT_S}];
    (
      node["shop"="bicycle"](${bbox});
      way["shop"="bicycle"](${bbox});
      node["amenity"="bicycle_repair_station"](${bbox});
    );
    out center;
  `;

  const res = await fetchWithRetry(OVERPASS_API, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal,
    timeout: OVERPASS_TIMEOUT_MS,
  });

  if (!res.ok) {
    throw new Error(`Overpass error: ${res.status}`);
  }

  const data = await res.json();
  const elements: OverpassElement[] = data?.elements ?? [];
  const results: RepairPoint[] = [];
  for (const el of elements) {
    try {
      const lat = el.lat || (el as any).center?.lat;
      const lon = el.lon || (el as any).center?.lon;
      if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) continue;

      const isStation = el.tags?.amenity === 'bicycle_repair_station';

      results.push({
        id: el.id,
        lat,
        lng: lon,
        name: el.tags?.name || (isStation ? 'Repair station' : 'Bike shop'),
        repairType: isStation ? 'repair_station' as const : 'shop' as const,
        phone: el.tags?.phone || el.tags?.['contact:phone'],
        openingHours: el.tags?.opening_hours,
      });
    } catch {
      // Skip malformed element
      continue;
    }
  }
  return results;
}

// Bail-out points: train stations, bus stops, hospitals
export type BailOutType = 'train_station' | 'bus_stop' | 'hospital';

export interface BailOutPoint {
  id: number;
  lat: number;
  lng: number;
  name: string;
  bailOutType: BailOutType;
  phone?: string;
}

export async function fetchBailOutPointsNearBbox(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}, signal?: AbortSignal): Promise<BailOutPoint[]> {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

  // Only major rail stations (with names) and hospitals — skip halts & bus stops to reduce clutter
  const query = `
    [out:json][timeout:${OVERPASS_QUERY_TIMEOUT_S}];
    (
      node["railway"="station"]["name"](${bbox});
      node["amenity"="hospital"]["name"](${bbox});
      way["amenity"="hospital"]["name"](${bbox});
    );
    out center;
  `;

  const res = await fetchWithRetry(OVERPASS_API, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal,
    timeout: OVERPASS_TIMEOUT_MS,
  });

  if (!res.ok) {
    throw new Error(`Overpass error: ${res.status}`);
  }

  const data = await res.json();
  const elements: OverpassElement[] = data?.elements ?? [];
  const results: BailOutPoint[] = [];
  for (const el of elements) {
    try {
      const lat = el.lat || (el as any).center?.lat;
      const lon = el.lon || (el as any).center?.lon;
      if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) continue;

      let bailOutType: BailOutType = 'hospital';
      if (el.tags?.railway === 'station') bailOutType = 'train_station';

      const label = bailOutType === 'train_station' ? 'Train station'
        : bailOutType === 'hospital' ? 'Hospital'
        : 'Bus stop';

      results.push({
        id: el.id,
        lat,
        lng: lon,
        name: el.tags?.name || label,
        bailOutType,
        phone: el.tags?.phone || el.tags?.['contact:phone'],
      });
    } catch {
      // Skip malformed element
      continue;
    }
  }
  return results;
}
