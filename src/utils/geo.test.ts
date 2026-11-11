import { describe, it, expect } from 'vitest';
import { lineString, point, nearestPointOnLine } from '@turf/turf';
import { projectOnRoute } from './geo';

// A west-east line at 52°N; 0.01° of latitude is about 1.11 km.
const route: GeoJSON.LineString = { type: 'LineString', coordinates: [[19, 52], [19.5, 52], [20, 52]] };

describe('projectOnRoute distance', () => {
  const isWithinCorridor = (r: GeoJSON.LineString, lat: number, lng: number, km: number) => projectOnRoute(r, lat, lng).distKm <= km;
  it('measures the distance from the route', () => {
    expect(projectOnRoute(route, 52.01, 19.3).distKm).toBeCloseTo(1.11, 1);
  });

  it('accepts points inside the corridor and rejects those outside', () => {
    expect(isWithinCorridor(route, 52.01, 19.3, 2)).toBe(true);
    expect(isWithinCorridor(route, 51.99, 19.7, 2)).toBe(true);
    expect(isWithinCorridor(route, 52.03, 19.3, 2)).toBe(false);
  });

  it('rounds the corridor off past the ends of the route', () => {
    expect(isWithinCorridor(route, 52, 20.02, 2)).toBe(true); // ~1.4 km past the end
    expect(isWithinCorridor(route, 52, 20.05, 2)).toBe(false); // ~3.4 km past the end
  });
});

describe('projectOnRoute', () => {
  // A wiggly ~330 km line across Poland, dense enough to resemble a real track.
  const coords: GeoJSON.Position[] = Array.from({ length: 2000 }, (_, i) => [
    17 + i * 0.002 + 0.01 * Math.sin(i / 15),
    51 + i * 0.001 + 0.01 * Math.cos(i / 23),
  ]);
  const track: GeoJSON.LineString = { type: 'LineString', coordinates: coords };

  it('agrees with turf for points near the route', () => {
    for (const [lat, lng] of [[51.02, 17.05], [51.9, 19.1], [52.5, 20.3], [53.05, 21.02], [51.5, 18.2]]) {
      const turf = nearestPointOnLine(lineString(coords), point([lng, lat])).properties;
      const ours = projectOnRoute(track, lat, lng);
      expect(Math.abs(ours.distKm - turf.dist!)).toBeLessThan(0.05 + turf.dist! * 0.005);
      expect(Math.abs(ours.alongKm - turf.location!)).toBeLessThan(0.2);
    }
  });

  it('is fast enough to run per locker', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) projectOnRoute(track, 51 + (i % 200) * 0.01, 17 + (i % 400) * 0.01);
    expect(performance.now() - start).toBeLessThan(1000); // turf took ~6 ms per call here
  });

  it('handles an empty line', () => {
    expect(projectOnRoute({ type: 'LineString', coordinates: [] }, 52, 19).distKm).toBe(Infinity);
  });
});
