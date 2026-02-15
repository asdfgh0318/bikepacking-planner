import { describe, it, expect } from 'vitest';
import { downsampleRouteForOverpass, routeHash } from './routeDownsampler';

// Helper to make a simple LineString
function makeLine(coordPairs: [number, number][]): GeoJSON.LineString {
  return { type: 'LineString', coordinates: coordPairs };
}

describe('downsampleRouteForOverpass', () => {
  it('handles 2-point route', () => {
    const line = makeLine([[20, 52], [21, 53]]);
    const result = downsampleRouteForOverpass(line);
    // Should output "lat1,lon1,lat2,lon2" format
    expect(result).toContain('52.');
    expect(result).toContain('20.');
    const parts = result.split(',');
    expect(parts.length).toBe(4); // 2 points × 2 coords
  });

  it('downsamples long route to target count', () => {
    // Create a route with 500 points
    const coords: [number, number][] = [];
    for (let i = 0; i < 500; i++) {
      coords.push([20 + i * 0.01, 52 + i * 0.005]);
    }
    const line = makeLine(coords);
    const result = downsampleRouteForOverpass(line, 20);
    const parts = result.split(',');
    expect(parts.length).toBe(40); // 20 points × 2 coords
  });

  it('always includes first and last point', () => {
    const coords: [number, number][] = [];
    for (let i = 0; i < 100; i++) {
      coords.push([20 + i * 0.01, 52 + i * 0.01]);
    }
    const line = makeLine(coords);
    const result = downsampleRouteForOverpass(line, 10);
    // First point lat should be at start
    expect(result.startsWith('52.00000,20.00000')).toBe(true);
    // Last point should be at end
    const lastLat = (52 + 99 * 0.01).toFixed(5);
    const lastLon = (20 + 99 * 0.01).toFixed(5);
    expect(result.endsWith(`${lastLat},${lastLon}`)).toBe(true);
  });

  it('returns lat,lon format (not lon,lat)', () => {
    const line = makeLine([[21.0, 52.0], [22.0, 53.0]]);
    const result = downsampleRouteForOverpass(line);
    // Overpass needs lat,lon — 52 should come before 21
    expect(result.startsWith('52.')).toBe(true);
  });
});

describe('routeHash', () => {
  it('returns a string hash', () => {
    const line = makeLine([[20, 52], [21, 53]]);
    const hash = routeHash(line);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    const line = makeLine([[20, 52], [21, 53]]);
    expect(routeHash(line)).toBe(routeHash(line));
  });

  it('differs for different routes', () => {
    const line1 = makeLine([[20, 52], [21, 53]]);
    const line2 = makeLine([[20, 52], [22, 54]]);
    expect(routeHash(line1)).not.toBe(routeHash(line2));
  });
});
