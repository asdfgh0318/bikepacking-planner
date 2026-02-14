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
  bounds: { north: number; south: number; east: number; west: number }
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

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`InPost API error: ${res.status}`);
  }

  const data = await res.json();
  // API returns { items: [...], count, page, ... }
  const items: InPostPoint[] = data.items || data;

  // Filter to bounding box
  return items.filter(
    (p) =>
      p.location.latitude >= bounds.south &&
      p.location.latitude <= bounds.north &&
      p.location.longitude >= bounds.west &&
      p.location.longitude <= bounds.east
  );
}
