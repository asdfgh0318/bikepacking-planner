import { describe, it, expect } from 'vitest';
import { generateShippingPlan } from './paczkomatStrategy';
import type {
  DaySegment,
  SupplyPoint,
  DietProfile,
  PaczkomatConfig,
  NightStop,
} from '../types';

// ---------------------------------------------------------------------------
// Helpers to build minimal test data
// ---------------------------------------------------------------------------

function makeDaySegment(overrides: Partial<DaySegment> & { dayNumber: number; startKm: number; endKm: number }): DaySegment {
  return {
    distanceKm: overrides.endKm - overrides.startKm,
    ascentM: 200,
    descentM: 180,
    startCoord: [20, 51],
    endCoord: [20.5, 51.2],
    supplyStops: [],
    estimatedHours: 5,
    difficulty: 'moderate',
    ...overrides,
  };
}

function makePaczkomat(id: string, distanceFromStartKm: number, extras?: Partial<SupplyPoint>): SupplyPoint {
  return {
    id,
    name: `Paczkomat ${id}`,
    lat: 51.1,
    lng: 20.1,
    type: 'paczkomat',
    distanceFromStartKm,
    ...extras,
  };
}

const standardProfile: DietProfile = {
  type: 'standard',
  label: 'Standard',
  description: 'Balanced diet for moderate cycling',
  calsPerKm: 22,
  calsPerAscentM: 3.5,
  baseCalsPerDay: 2000,
  macros: { carbsPct: 55, fatPct: 25, proteinPct: 20 },
};

const defaultConfig: PaczkomatConfig = {
  intervalDays: 3,
  prefer24h: true,
  preferNearNightStop: true,
  tripStartDate: '2026-07-01',
  leadTimeDays: 2,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateShippingPlan', () => {
  it('returns an empty plan when daySegments is empty', () => {
    const plan = generateShippingPlan([], [], standardProfile, defaultConfig);

    expect(plan).toEqual({
      parcels: [],
      totalParcels: 0,
      totalShippingWeightG: 0,
    });
  });

  it('returns an empty plan when there are no paczkomaty among supply points', () => {
    const days: DaySegment[] = [
      makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      makeDaySegment({ dayNumber: 2, startKm: 80, endKm: 160 }),
      makeDaySegment({ dayNumber: 3, startKm: 160, endKm: 240 }),
    ];
    const shops: SupplyPoint[] = [
      { id: 'shop-1', name: 'Zabka', lat: 51, lng: 20, type: 'zabka', distanceFromStartKm: 100 },
    ];

    const plan = generateShippingPlan(days, shops, standardProfile, defaultConfig);

    expect(plan.parcels).toHaveLength(0);
    expect(plan.totalParcels).toBe(0);
  });

  it('returns a ShippingPlan with parcels when paczkomaty are within segment range', () => {
    // 5-day trip, intervalDays=3 => parcel expected on day 3
    const days: DaySegment[] = [
      makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      makeDaySegment({ dayNumber: 2, startKm: 80, endKm: 160 }),
      makeDaySegment({ dayNumber: 3, startKm: 160, endKm: 240 }),
      makeDaySegment({ dayNumber: 4, startKm: 240, endKm: 320 }),
      makeDaySegment({ dayNumber: 5, startKm: 320, endKm: 400 }),
    ];

    // Paczkomat at km 230 -- within day 3 segment (160-240, search range 150-245)
    const supplyPoints: SupplyPoint[] = [
      makePaczkomat('pacz-230', 230),
    ];

    const plan = generateShippingPlan(days, supplyPoints, standardProfile, defaultConfig);

    expect(plan.totalParcels).toBeGreaterThanOrEqual(1);
    expect(plan.parcels[0].targetPaczkomat.id).toBe('pacz-230');
    expect(plan.parcels[0].dayNumber).toBe(3);
    expect(plan.parcels[0].items.length).toBeGreaterThan(0);
    expect(plan.parcels[0].totalWeightG).toBeGreaterThan(0);
    expect(plan.parcels[0].totalCalories).toBeGreaterThan(0);
    expect(plan.totalShippingWeightG).toBe(plan.parcels[0].totalWeightG);
  });

  it('sets correct dates: estimatedPickupDate and shipByDate', () => {
    const days: DaySegment[] = [
      makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      makeDaySegment({ dayNumber: 2, startKm: 80, endKm: 160 }),
      makeDaySegment({ dayNumber: 3, startKm: 160, endKm: 240 }),
    ];
    const supplyPoints: SupplyPoint[] = [makePaczkomat('pacz-200', 200)];

    const config: PaczkomatConfig = {
      ...defaultConfig,
      tripStartDate: '2026-07-01',
      leadTimeDays: 2,
      intervalDays: 3,
    };

    const plan = generateShippingPlan(days, supplyPoints, standardProfile, config);

    expect(plan.parcels).toHaveLength(1);
    // Day 3 pickup => tripStart + 2 days = 2026-07-03
    expect(plan.parcels[0].estimatedPickupDate).toBe('2026-07-03');
    // Ship by = pickup - leadTimeDays = 2026-07-01
    expect(plan.parcels[0].shipByDate).toBe('2026-07-01');
  });

  it('assigns correct locker sizes based on parcel weight', () => {
    // The locker size depends on the food items selected; we just verify
    // that the lockerSize is one of the valid values.
    const days: DaySegment[] = [
      makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      makeDaySegment({ dayNumber: 2, startKm: 80, endKm: 160 }),
      makeDaySegment({ dayNumber: 3, startKm: 160, endKm: 240 }),
    ];
    const supplyPoints: SupplyPoint[] = [makePaczkomat('pacz-200', 200)];

    const plan = generateShippingPlan(days, supplyPoints, standardProfile, defaultConfig);

    expect(plan.parcels).toHaveLength(1);
    expect(['A', 'B', 'C']).toContain(plan.parcels[0].lockerSize);
  });

  it('generates multiple parcels for long trips based on intervalDays', () => {
    // 9-day trip, intervalDays=3 => parcels on day 3, 6, 9
    const days: DaySegment[] = Array.from({ length: 9 }, (_, i) => {
      const dayNum = i + 1;
      return makeDaySegment({
        dayNumber: dayNum,
        startKm: i * 80,
        endKm: (i + 1) * 80,
      });
    });

    // Place paczkomaty within reach of day 3 (160-240), day 6 (400-480), day 9 (640-720)
    const supplyPoints: SupplyPoint[] = [
      makePaczkomat('pacz-d3', 210),
      makePaczkomat('pacz-d6', 450),
      makePaczkomat('pacz-d9', 700),
    ];

    const plan = generateShippingPlan(days, supplyPoints, standardProfile, defaultConfig);

    expect(plan.totalParcels).toBe(3);
    expect(plan.parcels.map((p) => p.dayNumber)).toEqual([3, 6, 9]);
  });

  // ---------------------------------------------------------------------------
  // Scoring-related behavior tested indirectly
  // ---------------------------------------------------------------------------

  it('prefers a paczkomat near the night stop (end of segment) over one further away', () => {
    const days: DaySegment[] = [
      makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      makeDaySegment({ dayNumber: 2, startKm: 80, endKm: 160 }),
      makeDaySegment({ dayNumber: 3, startKm: 160, endKm: 240 }),
    ];

    // Two paczkomaty in range for day 3: one at segment end, one at segment start
    const supplyPoints: SupplyPoint[] = [
      makePaczkomat('far-from-end', 165),  // 75 km from endKm=240
      makePaczkomat('near-end', 238),      // 2 km from endKm=240 => +14 score
    ];

    const plan = generateShippingPlan(days, supplyPoints, standardProfile, {
      ...defaultConfig,
      preferNearNightStop: true,
    });

    expect(plan.parcels).toHaveLength(1);
    expect(plan.parcels[0].targetPaczkomat.id).toBe('near-end');
  });

  it('deprioritizes paczkomaty within 30km of the route start', () => {
    // 1-day trip with intervalDays=1 to force parcel on day 1
    const days: DaySegment[] = [
      makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 100 }),
    ];

    // Paczkomat at km 20 (within 30km penalty) vs km 90 (near end, big bonus)
    const supplyPoints: SupplyPoint[] = [
      makePaczkomat('too-close', 20),
      makePaczkomat('good-spot', 98),
    ];

    const config: PaczkomatConfig = {
      ...defaultConfig,
      intervalDays: 1,
      preferNearNightStop: true,
    };

    const plan = generateShippingPlan(days, supplyPoints, standardProfile, config);

    expect(plan.parcels).toHaveLength(1);
    expect(plan.parcels[0].targetPaczkomat.id).toBe('good-spot');
  });

  it('gives bonus score to 24/7 paczkomaty when prefer24h is enabled', () => {
    const days: DaySegment[] = [
      makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      makeDaySegment({ dayNumber: 2, startKm: 80, endKm: 160 }),
      makeDaySegment({ dayNumber: 3, startKm: 160, endKm: 240 }),
    ];

    // Both at equal distance from end (~10km), but one is 24/7
    const supplyPoints: SupplyPoint[] = [
      makePaczkomat('not-24h', 232, { details: { is24h: false } }),
      makePaczkomat('is-24h', 233, { details: { is24h: true } }),
    ];

    const plan = generateShippingPlan(days, supplyPoints, standardProfile, {
      ...defaultConfig,
      prefer24h: true,
      preferNearNightStop: false, // disable night stop to isolate 24h effect
    });

    expect(plan.parcels).toHaveLength(1);
    expect(plan.parcels[0].targetPaczkomat.id).toBe('is-24h');
  });

  it('gives minor bonus for paczkomaty with large locker sizes', () => {
    const days: DaySegment[] = [
      makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      makeDaySegment({ dayNumber: 2, startKm: 80, endKm: 160 }),
      makeDaySegment({ dayNumber: 3, startKm: 160, endKm: 240 }),
    ];

    // Both at equal distance, neither 24h, but one has large lockers
    const supplyPoints: SupplyPoint[] = [
      makePaczkomat('small', 230, { details: { lockerSize: ['A', 'B'] } }),
      makePaczkomat('large', 231, { details: { lockerSize: ['A', 'B', 'C'] } }),
    ];

    const plan = generateShippingPlan(days, supplyPoints, standardProfile, {
      ...defaultConfig,
      prefer24h: false,
      preferNearNightStop: false,
    });

    expect(plan.parcels).toHaveLength(1);
    expect(plan.parcels[0].targetPaczkomat.id).toBe('large');
  });

  it('skips parcel days where no paczkomat is in range', () => {
    // 6-day trip, intervalDays=3 => tries day 3 and day 6
    // Only place a paczkomat within range of day 6
    const days: DaySegment[] = Array.from({ length: 6 }, (_, i) => {
      const dayNum = i + 1;
      return makeDaySegment({
        dayNumber: dayNum,
        startKm: i * 80,
        endKm: (i + 1) * 80,
      });
    });

    // Day 3 range: startKm=160, endKm=240 => search 150..245
    // Day 6 range: startKm=400, endKm=480 => search 390..485
    // Only place one at km 450 (day 6)
    const supplyPoints: SupplyPoint[] = [
      makePaczkomat('pacz-d6', 450),
    ];

    const plan = generateShippingPlan(days, supplyPoints, standardProfile, defaultConfig);

    expect(plan.totalParcels).toBe(1);
    expect(plan.parcels[0].dayNumber).toBe(6);
  });
});
