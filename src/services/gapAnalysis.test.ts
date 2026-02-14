import { describe, it, expect } from 'vitest';
import { analyzeSupplyGaps, analyzeWaterGaps } from './gapAnalysis';
import type { SupplyPoint } from '../types';

function makePoint(overrides: Partial<SupplyPoint> & { id: string; distanceFromStartKm: number; type: string }): SupplyPoint {
  return {
    lat: 51.1,
    lng: 17.0,
    name: overrides.name ?? `Point ${overrides.id}`,
    ...overrides,
  } as SupplyPoint;
}

// ─── analyzeSupplyGaps ───────────────────────────────────────────────

describe('analyzeSupplyGaps', () => {
  it('returns one big gap from start to end when there are no supply points', () => {
    const gaps = analyzeSupplyGaps([], 100);

    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({
      startKm: 0,
      endKm: 100,
      distanceKm: 100,
      severity: 'danger',
      fromName: 'Start',
      toName: 'End',
    });
  });

  it('returns no dangerous gaps when food points are evenly spaced within safe range', () => {
    // FOOD_THRESHOLDS: safe <30km, caution <50km, minEdgeGap 5, minBetweenGap 20
    // Points every 25km over a 100km route -> gaps of 25km each, all "safe"
    const points: SupplyPoint[] = [
      makePoint({ id: '1', distanceFromStartKm: 25, type: 'zabka', name: 'Zabka A' }),
      makePoint({ id: '2', distanceFromStartKm: 50, type: 'biedronka', name: 'Biedronka B' }),
      makePoint({ id: '3', distanceFromStartKm: 75, type: 'shop', name: 'Shop C' }),
    ];

    const gaps = analyzeSupplyGaps(points, 100);

    for (const gap of gaps) {
      expect(gap.severity).toBe('safe');
    }
    // No gap should exceed the safe threshold of 30km
    for (const gap of gaps) {
      expect(gap.distanceKm).toBeLessThan(30);
    }
  });

  it('reports a large gap in the middle with correct severity', () => {
    // Two food points close to start and close to end, leaving a 70km gap in the middle
    const points: SupplyPoint[] = [
      makePoint({ id: '1', distanceFromStartKm: 10, type: 'zabka', name: 'Zabka Start' }),
      makePoint({ id: '2', distanceFromStartKm: 80, type: 'shop', name: 'Shop End' }),
    ];

    const gaps = analyzeSupplyGaps(points, 100);

    // The middle gap is 80 - 10 = 70km, well above caution (50km) -> danger
    const middleGap = gaps.find(g => g.fromName === 'Zabka Start' && g.toName === 'Shop End');
    expect(middleGap).toBeDefined();
    expect(middleGap!.distanceKm).toBe(70);
    expect(middleGap!.severity).toBe('danger');
  });

  it('ignores small edge gaps when supply points are near start and end', () => {
    // minEdgeGap for food is 5km
    // Point at 3km from start and 97km from start on a 100km route
    // Edge gaps: 3km and 3km, both below minEdgeGap=5, so not reported
    const points: SupplyPoint[] = [
      makePoint({ id: '1', distanceFromStartKm: 3, type: 'zabka', name: 'Near Start' }),
      makePoint({ id: '2', distanceFromStartKm: 97, type: 'shop', name: 'Near End' }),
    ];

    const gaps = analyzeSupplyGaps(points, 100);

    // Should NOT have a gap starting at 0 (start edge gap is 3km < 5km threshold)
    const startEdge = gaps.find(g => g.startKm === 0);
    expect(startEdge).toBeUndefined();

    // Should NOT have a gap ending at 100 (end edge gap is 3km < 5km threshold)
    const endEdge = gaps.find(g => g.endKm === 100);
    expect(endEdge).toBeUndefined();
  });

  it('ignores non-food supply point types', () => {
    // Only water and campsite points -- should produce one big gap
    const points: SupplyPoint[] = [
      makePoint({ id: '1', distanceFromStartKm: 30, type: 'water', name: 'Spring' }),
      makePoint({ id: '2', distanceFromStartKm: 60, type: 'campsite', name: 'Camp' }),
    ];

    const gaps = analyzeSupplyGaps(points, 100);

    expect(gaps).toHaveLength(1);
    expect(gaps[0].distanceKm).toBe(100);
    expect(gaps[0].severity).toBe('danger');
  });

  it('returns empty array when totalDistanceKm is zero', () => {
    const gaps = analyzeSupplyGaps([], 0);
    expect(gaps).toHaveLength(0);
  });

  it('sorts gaps by distance descending', () => {
    // Create an asymmetric setup: gaps of different sizes
    const points: SupplyPoint[] = [
      makePoint({ id: '1', distanceFromStartKm: 10, type: 'zabka', name: 'A' }),
      makePoint({ id: '2', distanceFromStartKm: 60, type: 'shop', name: 'B' }),
      makePoint({ id: '3', distanceFromStartKm: 80, type: 'biedronka', name: 'C' }),
    ];

    const gaps = analyzeSupplyGaps(points, 100);

    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i - 1].distanceKm).toBeGreaterThanOrEqual(gaps[i].distanceKm);
    }
  });
});

// ─── analyzeWaterGaps ────────────────────────────────────────────────

describe('analyzeWaterGaps', () => {
  it('returns one big gap when there are no water points', () => {
    const gaps = analyzeWaterGaps([], 100);

    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({
      startKm: 0,
      endKm: 100,
      distanceKm: 100,
      severity: 'danger',
    });
  });

  it('only considers water-type points', () => {
    // Food points should be ignored by water analysis
    const points: SupplyPoint[] = [
      makePoint({ id: '1', distanceFromStartKm: 25, type: 'zabka', name: 'Zabka' }),
      makePoint({ id: '2', distanceFromStartKm: 50, type: 'water', name: 'Water Source' }),
      makePoint({ id: '3', distanceFromStartKm: 75, type: 'shop', name: 'Shop' }),
    ];

    const gaps = analyzeWaterGaps(points, 100);

    // Only the water point at 50km matters, so there should be:
    // gap from start to 50km and gap from 50km to end (both reported if > minEdgeGap=10)
    const startGap = gaps.find(g => g.fromName === 'Start');
    expect(startGap).toBeDefined();
    expect(startGap!.endKm).toBe(50);
    expect(startGap!.distanceKm).toBe(50);
  });

  it('uses default thresholds when maxTempC is not provided', () => {
    // Default water thresholds: safe <20km, caution <40km
    // A 15km gap should be safe
    const points: SupplyPoint[] = [
      makePoint({ id: '1', distanceFromStartKm: 15, type: 'water', name: 'W1' }),
      makePoint({ id: '2', distanceFromStartKm: 85, type: 'water', name: 'W2' }),
    ];

    const gaps = analyzeWaterGaps(points, 100);

    const startGap = gaps.find(g => g.startKm === 0);
    expect(startGap).toBeDefined();
    expect(startGap!.distanceKm).toBe(15);
    expect(startGap!.severity).toBe('safe');
  });

  it('uses tighter thresholds when maxTempC > 30 (safe becomes 14km)', () => {
    // With >30C: factor 0.7 -> safe = 20*0.7 = 14km, caution = 40*0.7 = 28km
    // A 15km gap that would be safe at normal temps should now be "caution"
    const points: SupplyPoint[] = [
      makePoint({ id: '1', distanceFromStartKm: 15, type: 'water', name: 'W1' }),
      makePoint({ id: '2', distanceFromStartKm: 85, type: 'water', name: 'W2' }),
    ];

    const gaps = analyzeWaterGaps(points, 100, 32);

    const startGap = gaps.find(g => g.startKm === 0);
    expect(startGap).toBeDefined();
    expect(startGap!.distanceKm).toBe(15);
    // 15km > 14km (safe), 15km < 28km (caution), so severity = 'caution'
    expect(startGap!.severity).toBe('caution');
  });

  it('uses even tighter thresholds when maxTempC > 35 (safe becomes 10km)', () => {
    // With >35C: factor 0.5 -> safe = 20*0.5 = 10km, caution = 40*0.5 = 20km
    // A 15km gap should now be "caution"
    // A 25km gap should now be "danger"
    const points: SupplyPoint[] = [
      makePoint({ id: '1', distanceFromStartKm: 15, type: 'water', name: 'W1' }),
      makePoint({ id: '2', distanceFromStartKm: 85, type: 'water', name: 'W2' }),
    ];

    const gapsHot = analyzeWaterGaps(points, 100, 38);

    const startGap = gapsHot.find(g => g.startKm === 0);
    expect(startGap).toBeDefined();
    expect(startGap!.distanceKm).toBe(15);
    // 15km > 10km (safe), 15km < 20km (caution) -> caution
    expect(startGap!.severity).toBe('caution');

    // The middle gap 85 - 15 = 70km is definitely danger
    const middleGap = gapsHot.find(g => g.fromName === 'W1' && g.toName === 'W2');
    expect(middleGap).toBeDefined();
    expect(middleGap!.severity).toBe('danger');
  });

  it('keeps default thresholds when maxTempC <= 30', () => {
    const points: SupplyPoint[] = [
      makePoint({ id: '1', distanceFromStartKm: 15, type: 'water', name: 'W1' }),
      makePoint({ id: '2', distanceFromStartKm: 85, type: 'water', name: 'W2' }),
    ];

    const gaps = analyzeWaterGaps(points, 100, 25);

    const startGap = gaps.find(g => g.startKm === 0);
    expect(startGap).toBeDefined();
    expect(startGap!.distanceKm).toBe(15);
    // 15km < 20km safe threshold -> safe (same as no temp)
    expect(startGap!.severity).toBe('safe');
  });

  it('produces no gaps when water points are densely placed', () => {
    // Water every 10km on a 50km route
    const points: SupplyPoint[] = [
      makePoint({ id: '1', distanceFromStartKm: 5, type: 'water', name: 'W1' }),
      makePoint({ id: '2', distanceFromStartKm: 15, type: 'water', name: 'W2' }),
      makePoint({ id: '3', distanceFromStartKm: 25, type: 'water', name: 'W3' }),
      makePoint({ id: '4', distanceFromStartKm: 35, type: 'water', name: 'W4' }),
      makePoint({ id: '5', distanceFromStartKm: 45, type: 'water', name: 'W5' }),
    ];

    const gaps = analyzeWaterGaps(points, 50);

    // All between-stop gaps are 10km (below minBetweenGap of 15), so none reported
    // Edge gaps: 5km from start (below minEdgeGap of 10) and 5km to end (below 10)
    expect(gaps).toHaveLength(0);
  });
});
