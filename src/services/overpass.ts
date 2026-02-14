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
}): Promise<ShopPoint[]> {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

  // Query Żabka and Biedronka using brand:wikidata for reliability
  const query = `
    [out:json][timeout:25];
    (
      node["brand:wikidata"="Q2874810"](${bbox});
      node["brand:wikidata"="Q857855"](${bbox});
    );
    out center;
  `;

  const res = await fetch(OVERPASS_API, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!res.ok) {
    throw new Error(`Overpass error: ${res.status}`);
  }

  const data = await res.json();
  return (data.elements as OverpassElement[]).map((el) => ({
    id: el.id,
    lat: el.lat,
    lng: el.lon,
    name: el.tags.name || el.tags.brand || 'Shop',
    brand: el.tags.brand || 'unknown',
    openingHours: el.tags.opening_hours,
  }));
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
}): Promise<WaterPoint[]> {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

  const query = `
    [out:json][timeout:25];
    (
      node["natural"="spring"](${bbox});
      node["amenity"="drinking_water"](${bbox});
      node["amenity"="fountain"]["drinking_water"="yes"](${bbox});
      node["man_made"="water_tap"](${bbox});
    );
    out center;
  `;

  const res = await fetch(OVERPASS_API, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!res.ok) {
    throw new Error(`Overpass error: ${res.status}`);
  }

  const data = await res.json();
  return (data.elements as OverpassElement[]).map((el) => {
    let waterType: WaterPoint['waterType'] = 'drinking_water';
    if (el.tags.natural === 'spring') waterType = 'spring';
    else if (el.tags.amenity === 'fountain') waterType = 'fountain';
    else if (el.tags.man_made === 'water_tap') waterType = 'tap';

    return {
      id: el.id,
      lat: el.lat,
      lng: el.lon,
      name: el.tags.name || waterType.replace('_', ' '),
      waterType,
    };
  });
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
}): Promise<CampsitePoint[]> {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

  const query = `
    [out:json][timeout:25];
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

  const res = await fetch(OVERPASS_API, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!res.ok) {
    throw new Error(`Overpass error: ${res.status}`);
  }

  const data = await res.json();
  return (data.elements as OverpassElement[]).map((el) => {
    // For way elements, use center coordinates
    const lat = el.lat || (el as any).center?.lat;
    const lon = el.lon || (el as any).center?.lon;
    if (!lat || !lon) return null;

    let campsiteType: CampsitePoint['campsiteType'] = 'camp_site';
    if (el.tags.tourism === 'wilderness_hut') campsiteType = 'wilderness_hut';
    else if (el.tags.amenity === 'shelter') campsiteType = 'shelter';
    else if (el.tags.camp_site === 'bivouac') campsiteType = 'bivouac';

    const label = campsiteType === 'camp_site' ? 'Campsite'
      : campsiteType === 'wilderness_hut' ? 'Wilderness hut'
      : campsiteType === 'shelter' ? 'Shelter'
      : 'Bivouac';

    return {
      id: el.id,
      lat,
      lng: lon,
      name: el.tags.name || label,
      campsiteType,
      capacity: el.tags.capacity,
      fee: el.tags.fee !== 'no',
      openingHours: el.tags.opening_hours,
    };
  }).filter(Boolean) as CampsitePoint[];
}
