import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchPaczkomaty, paczkomatQueryPlan } from './inpost';
import { distanceKm } from '../utils/distance';

// Roughly 111 km due north.
const ROUTE: GeoJSON.LineString = { type: 'LineString', coordinates: [[19, 51], [19, 52]] };

const locker = (name: string, lat: number, lng: number) => ({
  name,
  location: { latitude: lat, longitude: lng },
  address: { line1: 'Street 1', line2: '00-001 Town' },
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('paczkomatQueryPlan', () => {
  it('samples from the first to the last route point', () => {
    const { points } = paczkomatQueryPlan(ROUTE, 2);
    expect(points[0]).toEqual([51, 19]);
    expect(points[points.length - 1]).toEqual([52, 19]);
    expect(points.length).toBeGreaterThan(5);
    expect(points.length).toBeLessThanOrEqual(25);
  });

  it('picks a radius that covers the corridor between neighbouring samples', () => {
    const corridorKm = 3;
    const { points, radiusM } = paczkomatQueryPlan(ROUTE, corridorKm);
    for (let i = 1; i < points.length; i++) {
      const gapKm = distanceKm(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
      const reachKm = Math.hypot(gapKm / 2, corridorKm);
      expect(radiusM / 1000).toBeGreaterThanOrEqual(reachKm - 0.05);
    }
  });

  it('caps the number of queries on a long route', () => {
    const long: GeoJSON.LineString = { type: 'LineString', coordinates: [[19, 49.5], [19, 54.5]] };
    expect(paczkomatQueryPlan(long, 2).points).toHaveLength(25);
  });

  it('uses two points for a very short route', () => {
    const short: GeoJSON.LineString = { type: 'LineString', coordinates: [[19, 51], [19.01, 51]] };
    expect(paczkomatQueryPlan(short, 2).points).toHaveLength(2);
  });
});

describe('fetchPaczkomaty', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('queries around each sample point with a radius and a limit', async () => {
    const fetchMock = vi.fn(async (url: string) => json({ items: [], href: url }));
    vi.stubGlobal('fetch', fetchMock);
    const { points, radiusM } = paczkomatQueryPlan(ROUTE, 2);

    await fetchPaczkomaty(ROUTE, 2);

    expect(fetchMock).toHaveBeenCalledTimes(points.length);
    const queried = fetchMock.mock.calls.map((c) => new URL(c[0]).searchParams);
    for (const params of queried) {
      expect(params.get('max_distance')).toBe(String(radiusM));
      expect(params.get('limit')).toBe('500');
      expect(params.get('type')).toBe('parcel_locker');
      expect(params.get('status')).toBe('Operating');
    }
    expect(queried.map((p) => p.get('relative_point'))).toEqual(
      points.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`),
    );
  });

  it('merges all queries, de-duplicates by name and drops malformed items', async () => {
    let call = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      call++;
      return json({
        items: [
          locker('SHARED01', 51.5, 19),
          locker(`ONLY${call}`, 51 + call / 100, 19),
          { name: 'BROKEN', location: {} },
        ],
      });
    }));
    const { points } = paczkomatQueryPlan(ROUTE, 2);

    const result = await fetchPaczkomaty(ROUTE, 2);

    const names = result.map((p) => p.name);
    expect(names.filter((n) => n === 'SHARED01')).toHaveLength(1);
    expect(names).not.toContain('BROKEN');
    expect(result).toHaveLength(points.length + 1);
  });

  it('keeps the lockers it got when some queries fail', async () => {
    let call = 0;
    vi.stubGlobal('fetch', vi.fn(async () => (++call === 1 ? json({ items: [locker('A', 51, 19)] }) : json({}, 400))));
    await expect(fetchPaczkomaty(ROUTE, 2)).resolves.toHaveLength(1);
  });

  it('rejects when every query fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({}, 400)));
    await expect(fetchPaczkomaty(ROUTE, 2)).rejects.toThrow(/InPost API error: 400/);
  });
});
