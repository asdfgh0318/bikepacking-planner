import { describe, it, expect } from 'vitest';
import { splitRouteIntoDays } from './daySplitter';
import type { SupplyPoint } from '../types';

/**
 * Helper: generate a straight-line LineString with elevation.
 *
 * At latitude 51N, 1 degree of longitude is about 70 km.
 * We generate `numPoints` evenly spaced points from startLng to endLng
 * along a constant latitude, with a gentle elevation profile.
 *
 * @param targetKm - desired route length in km (approximate)
 * @param numPoints - number of coordinate vertices
 */
function makeLineString(
  targetKm: number,
  numPoints: number = 100,
): GeoJSON.LineString {
  // 1 degree longitude at lat 51 is ~70 km
  const kmPerDegree = 70;
  const totalDegreesLng = targetKm / kmPerDegree;

  const startLng = 19.0;
  const lat = 51.0;

  const coordinates: [number, number, number][] = [];
  for (let i = 0; i < numPoints; i++) {
    const fraction = i / (numPoints - 1);
    const lng = startLng + fraction * totalDegreesLng;
    // Gentle sine-wave elevation between 200m and 400m
    const ele = 300 + 100 * Math.sin(fraction * Math.PI * 4);
    coordinates.push([lng, lat, ele]);
  }

  return {
    type: 'LineString',
    coordinates,
  };
}

const emptySupplyPoints: SupplyPoint[] = [];

/* ------------------------------------------------------------------ */
/*  splitRouteIntoDays                                                */
/* ------------------------------------------------------------------ */

describe('splitRouteIntoDays', () => {
  it('returns 1 day for a short route (50km, target 80km/day)', () => {
    const geometry = makeLineString(50, 60);
    const days = splitRouteIntoDays(geometry, 80, emptySupplyPoints);

    expect(days).toHaveLength(1);
    expect(days[0].dayNumber).toBe(1);
  });

  it('returns 2-3 days for a medium route (200km, target 80km/day)', () => {
    const geometry = makeLineString(200, 200);
    const days = splitRouteIntoDays(geometry, 80, emptySupplyPoints);

    expect(days.length).toBeGreaterThanOrEqual(2);
    expect(days.length).toBeLessThanOrEqual(3);
  });

  it('each day has dayNumber, startKm, endKm, distanceKm', () => {
    const geometry = makeLineString(200, 200);
    const days = splitRouteIntoDays(geometry, 80, emptySupplyPoints);

    for (const day of days) {
      expect(day).toHaveProperty('dayNumber');
      expect(day).toHaveProperty('startKm');
      expect(day).toHaveProperty('endKm');
      expect(day).toHaveProperty('distanceKm');

      expect(typeof day.dayNumber).toBe('number');
      expect(typeof day.startKm).toBe('number');
      expect(typeof day.endKm).toBe('number');
      expect(typeof day.distanceKm).toBe('number');

      expect(day.dayNumber).toBeGreaterThan(0);
      expect(day.endKm).toBeGreaterThan(day.startKm);
      expect(day.distanceKm).toBeCloseTo(day.endKm - day.startKm, 5);
    }
  });

  it('days cover the full route (last day endKm equals total distance)', () => {
    const geometry = makeLineString(200, 200);
    const days = splitRouteIntoDays(geometry, 80, emptySupplyPoints);

    // First day starts at 0
    expect(days[0].startKm).toBe(0);

    // Day numbers are sequential starting at 1
    days.forEach((day, i) => {
      expect(day.dayNumber).toBe(i + 1);
    });

    // Each day's startKm equals the previous day's endKm (continuous)
    for (let i = 1; i < days.length; i++) {
      expect(days[i].startKm).toBe(days[i - 1].endKm);
    }

    // Last day endKm should cover the full route
    // Use turf to compute expected total length for comparison
    const lastDay = days[days.length - 1];
    const totalDayDistance = days.reduce((sum, d) => sum + d.distanceKm, 0);

    // The total distance across all days should approximately equal the
    // last day's endKm (which is the total route length).
    expect(totalDayDistance).toBeCloseTo(lastDay.endKm, 1);

    // Route is ~200km; last endKm should be in that range
    expect(lastDay.endKm).toBeGreaterThan(180);
    expect(lastDay.endKm).toBeLessThan(220);
  });

  it('returns empty array for zero-length route', () => {
    const geometry: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: [
        [19.0, 51.0, 300],
        [19.0, 51.0, 300],
      ],
    };

    const days = splitRouteIntoDays(geometry, 80, emptySupplyPoints);

    expect(days).toHaveLength(0);
  });

  it('includes elevation data (ascentM, descentM) in each day', () => {
    const geometry = makeLineString(200, 200);
    const days = splitRouteIntoDays(geometry, 80, emptySupplyPoints);

    for (const day of days) {
      expect(day).toHaveProperty('ascentM');
      expect(day).toHaveProperty('descentM');
      expect(typeof day.ascentM).toBe('number');
      expect(typeof day.descentM).toBe('number');
      expect(day.ascentM).toBeGreaterThanOrEqual(0);
      expect(day.descentM).toBeGreaterThanOrEqual(0);
    }
  });

  it('includes estimatedHours and difficulty in each day', () => {
    const geometry = makeLineString(200, 200);
    const days = splitRouteIntoDays(geometry, 80, emptySupplyPoints);

    for (const day of days) {
      expect(day).toHaveProperty('estimatedHours');
      expect(day).toHaveProperty('difficulty');
      expect(typeof day.estimatedHours).toBe('number');
      expect(day.estimatedHours).toBeGreaterThan(0);
      expect(['easy', 'moderate', 'hard']).toContain(day.difficulty);
    }
  });

  it('does not create tiny final segments (merges into previous day)', () => {
    // Route of ~95km with 80km target: should be 1 day (not 80km + 15km)
    // because the remainder (15km) is < 30% of 80km (24km threshold)
    const geometry = makeLineString(95, 100);
    const days = splitRouteIntoDays(geometry, 80, emptySupplyPoints);

    // Should merge into 1 day since the leftover is small
    expect(days).toHaveLength(1);
  });
});
