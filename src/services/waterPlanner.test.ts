import { describe, it, expect } from 'vitest';
import { getConsumptionRate, generateWaterPlan } from './waterPlanner';
import type { SupplyPoint, DaySegment, DayWeather } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────

function makeSegment(overrides: Partial<DaySegment> & { dayNumber: number; startKm: number; endKm: number }): DaySegment {
  const distanceKm = overrides.endKm - overrides.startKm;
  return {
    distanceKm,
    ascentM: 0,
    descentM: 0,
    startCoord: [17.0, 51.1],
    endCoord: [17.5, 51.2],
    supplyStops: [],
    estimatedHours: distanceKm / 15, // ~15 km/h
    difficulty: 'moderate',
    ...overrides,
  };
}

function makeWaterPoint(id: string, km: number, name?: string): SupplyPoint {
  return {
    id,
    name: name ?? `Water ${id}`,
    lat: 51.1,
    lng: 17.0,
    type: 'water',
    distanceFromStartKm: km,
  };
}

function makeDayWeather(dayNumber: number, tempMax: number): DayWeather {
  return {
    dayNumber,
    date: '2026-07-01',
    tempMin: tempMax - 10,
    tempMax,
    precipitationSum: 0,
    precipitationProbMax: 0,
    windSpeedMax: 10,
    windDirection: 180,
    condition: 'clear',
    weatherCode: 0,
  };
}

// ─── getConsumptionRate ─────────────────────────────────────────────

describe('getConsumptionRate', () => {
  it('returns base rate (0.5 L/hr) at or below 25°C', () => {
    expect(getConsumptionRate(20)).toBe(0.5);
    expect(getConsumptionRate(25)).toBe(0.5);
    expect(getConsumptionRate(0)).toBe(0.5);
  });

  it('increases consumption rate for temperatures above 25°C', () => {
    // 30°C = 5° above threshold => +0.2 => 0.7
    expect(getConsumptionRate(30)).toBeCloseTo(0.7, 5);
    // 35°C = 10° above threshold => +0.4 => 0.9
    expect(getConsumptionRate(35)).toBeCloseTo(0.9, 5);
    // 40°C = 15° above threshold => +0.6 => 1.1
    expect(getConsumptionRate(40)).toBeCloseTo(1.1, 5);
  });
});

// ─── generateWaterPlan ──────────────────────────────────────────────

describe('generateWaterPlan', () => {
  it('computes basic consumption over a 50km ride at 20°C', () => {
    const segments: DaySegment[] = [
      makeSegment({ dayNumber: 1, startKm: 0, endKm: 50 }),
    ];
    const weather = { days: [makeDayWeather(1, 20)] };

    const plan = generateWaterPlan(segments, [], weather, 2.0);

    // Should have level curve entries
    expect(plan.levelCurve.length).toBeGreaterThan(0);
    // Total consumption should be positive
    expect(plan.totalConsumptionL).toBeGreaterThan(0);
    // No refills since no water sources
    expect(plan.refillCount).toBe(0);
    // All level curve entries should have dayNumber 1
    for (const pt of plan.levelCurve) {
      expect(pt.dayNumber).toBe(1);
    }
  });

  it('increases total consumption in hot weather', () => {
    const segments: DaySegment[] = [
      makeSegment({ dayNumber: 1, startKm: 0, endKm: 50 }),
    ];
    const coolWeather = { days: [makeDayWeather(1, 20)] };
    const hotWeather = { days: [makeDayWeather(1, 35)] };

    const coolPlan = generateWaterPlan(segments, [], coolWeather, 3.0);
    const hotPlan = generateWaterPlan(segments, [], hotWeather, 3.0);

    expect(hotPlan.totalConsumptionL).toBeGreaterThan(coolPlan.totalConsumptionL);
  });

  it('refills at water source and resets to capacity', () => {
    const segments: DaySegment[] = [
      makeSegment({ dayNumber: 1, startKm: 0, endKm: 50 }),
    ];
    const waterPoints: SupplyPoint[] = [
      makeWaterPoint('w1', 25, 'Spring at km25'),
    ];
    const weather = { days: [makeDayWeather(1, 20)] };

    const plan = generateWaterPlan(segments, waterPoints, weather, 2.0);

    expect(plan.refillCount).toBe(1);
    // After the refill, the water level at km 25 should be close to capacity
    const atRefill = plan.levelCurve.find(pt => pt.km === 25);
    expect(atRefill).toBeDefined();
    // It should be near capacity minus one km of consumption (refilled then consumed)
    expect(atRefill!.liters).toBeGreaterThan(1.5);
  });

  it('detects critical points when water drops below 0.3L', () => {
    // Long segment with no water sources and small capacity -> should go critical
    const segments: DaySegment[] = [
      makeSegment({ dayNumber: 1, startKm: 0, endKm: 80, estimatedHours: 6 }),
    ];
    // One water source far away to enable nearest-source lookup
    const waterPoints: SupplyPoint[] = [
      makeWaterPoint('w1', 200, 'Distant Spring'),
    ];
    const weather = { days: [makeDayWeather(1, 20)] };

    const plan = generateWaterPlan(segments, waterPoints, weather, 1.0);

    // With 1L capacity and 0.5 L/hr over 6 hours (80km), total consumption ~ 3L
    // Should definitely hit critical levels
    expect(plan.criticalPoints.length).toBeGreaterThan(0);
    for (const cp of plan.criticalPoints) {
      expect(cp.liters).toBeLessThan(0.3);
      expect(cp.nearestSourceName).toBe('Distant Spring');
      expect(cp.nearestSourceKm).toBe(200);
    }
  });

  it('runs dry quickly with empty water sources array', () => {
    const segments: DaySegment[] = [
      makeSegment({ dayNumber: 1, startKm: 0, endKm: 100, estimatedHours: 7 }),
    ];
    const weather = { days: [makeDayWeather(1, 25)] };

    const plan = generateWaterPlan(segments, [], weather, 1.5);

    // No refills
    expect(plan.refillCount).toBe(0);
    // No critical points (no water sources to reference)
    // But water should drop to 0 at some point
    const endLevel = plan.levelCurve[plan.levelCurve.length - 1];
    expect(endLevel.liters).toBe(0);
    // Total consumption is clamped by available water
    expect(plan.totalConsumptionL).toBeGreaterThan(0);
  });

  it('generates recommendations for key refill points', () => {
    // Create a scenario where water drops below 80% before hitting a source
    const segments: DaySegment[] = [
      makeSegment({ dayNumber: 1, startKm: 0, endKm: 80, estimatedHours: 6 }),
    ];
    const waterPoints: SupplyPoint[] = [
      makeWaterPoint('w1', 40, 'Mid Spring'),
      makeWaterPoint('w2', 70, 'Late Spring'),
    ];
    const weather = { days: [makeDayWeather(1, 30)] };

    const plan = generateWaterPlan(segments, waterPoints, weather, 2.0);

    // With higher consumption at 30C and 2L capacity,
    // by km 40 water should be well below 80% capacity, triggering a recommendation
    expect(plan.recommendations.length).toBeGreaterThan(0);
    expect(plan.recommendations[0]).toContain('Fill up at km');
    expect(plan.recommendations[0]).toContain('Mid Spring');
  });

  it('uses default 20°C when no weather data is provided', () => {
    const segments: DaySegment[] = [
      makeSegment({ dayNumber: 1, startKm: 0, endKm: 30 }),
    ];

    const planNoWeather = generateWaterPlan(segments, [], null, 2.0);
    const planWith20C = generateWaterPlan(segments, [], { days: [makeDayWeather(1, 20)] }, 2.0);

    // Should produce identical consumption
    expect(planNoWeather.totalConsumptionL).toBeCloseTo(planWith20C.totalConsumptionL, 1);
  });

  it('handles multi-day segments with daily capacity reset', () => {
    const segments: DaySegment[] = [
      makeSegment({ dayNumber: 1, startKm: 0, endKm: 50 }),
      makeSegment({ dayNumber: 2, startKm: 50, endKm: 100 }),
    ];
    const weather = {
      days: [makeDayWeather(1, 20), makeDayWeather(2, 20)],
    };

    const plan = generateWaterPlan(segments, [], weather, 2.0);

    // The first point of day 2 should start at or near full capacity
    // (capacity is reset between days)
    const day2Start = plan.levelCurve.find(pt => pt.dayNumber === 2);
    expect(day2Start).toBeDefined();
    // The first km of day 2 should have water near capacity minus one km's consumption
    expect(day2Start!.liters).toBeGreaterThan(1.5);
  });
});
