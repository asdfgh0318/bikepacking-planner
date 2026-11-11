import { describe, it, expect } from 'vitest';
import { generateUnifiedPlan } from './unifiedPlan';
import { RESUPPLY_PRESETS } from './resupplyPlanner';
import { DIET_PROFILES, calculateDailyCalories } from './diet';
import type { DaySegment, PaczkomatConfig, SupplyPoint } from '../types';

function day(dayNumber: number): DaySegment {
  const startKm = (dayNumber - 1) * 80;
  return {
    dayNumber,
    startKm,
    endKm: startKm + 80,
    distanceKm: 80,
    ascentM: 500,
    descentM: 500,
    startCoord: [20, 51],
    endCoord: [20.5, 51.2],
    supplyStops: [],
    estimatedHours: 6,
    difficulty: 'moderate',
  };
}

function point(id: string, km: number, type: SupplyPoint['type']): SupplyPoint {
  return { id, name: id, lat: 51, lng: 20, type, distanceFromStartKm: km };
}

const days = [day(1), day(2), day(3)];
const points = [
  point('p1', 10, 'paczkomat'),
  point('p2', 95, 'paczkomat'),
  point('z', 200, 'zabka'),
  point('p3', 235, 'paczkomat'),
];
const shipping: PaczkomatConfig = {
  intervalDays: 3,
  prefer24h: true,
  preferNearNightStop: true,
  tripStartDate: '2026-07-01', // a Wednesday; the trip has no Sunday
  leadTimeDays: 2,
};
const config = {
  rideStartHour: 8,
  avgSpeedKmh: 16,
  tripStartDate: '2026-07-01',
  strategy: RESUPPLY_PRESETS['daily-ration'],
};
const profile = DIET_PROFILES.standard;

describe('generateUnifiedPlan with Paczkomat shipping', () => {
  const plan = generateUnifiedPlan(profile, days, points, [], shipping, config);

  it('never plans a shop purchase at a locker', () => {
    const shopStops = plan.resupply.purchases.filter((p) => p.source === 'shop');
    expect(shopStops.map((p) => p.stopId)).toEqual(['z']);
    expect(shopStops.every((p) => p.stopType !== 'paczkomat')).toBe(true);
  });

  it('only lists a locker where a parcel is actually shipped', () => {
    const lockerStops = plan.resupply.purchases.filter((p) => p.stopType === 'paczkomat');
    expect(lockerStops).toHaveLength(1);
    expect(lockerStops[0].stopId).toBe('p3');
    expect(lockerStops[0].source).toBe('paczkomat');
    expect(lockerStops[0].dayNumber).toBe(3);
  });

  it('warns about days whose only "food" is an empty locker', () => {
    const deficits = plan.resupply.warnings.filter((w) => w.type === 'calorie_deficit');
    expect(deficits.map((w) => w.dayNumber)).toEqual([1, 2]);
  });

  it('takes the parcel calories off the same-day shop purchase', () => {
    const parcel = plan.shipping!.parcels[0];
    const shop = plan.resupply.purchases.find((p) => p.stopId === 'z')!;
    const need = calculateDailyCalories(profile, 80, 500);
    const withoutParcel = generateUnifiedPlan(profile, days, points, [], null, config)
      .resupply.purchases.find((p) => p.stopId === 'z')!;
    expect(shop.totalCalories).toBeLessThan(withoutParcel.totalCalories);
    expect(shop.totalCalories + parcel.totalCalories).toBeGreaterThanOrEqual(need);
    expect(plan.dayBreakdown[2].caloriesFromParcels).toBe(parcel.totalCalories);
  });

  it('adds the parcel weight to the carry curve', () => {
    const parcel = plan.shipping!.parcels[0];
    const atLocker = plan.resupply.carryWeightCurve.find((c) => c.distanceKm === 235);
    expect(atLocker).toBeDefined();
    expect(atLocker!.foodWeightG).toBeGreaterThanOrEqual(parcel.totalWeightG);
  });

  it('gives the parcel pickup a real arrival time instead of midnight', () => {
    const pickup = plan.resupply.purchases.find((p) => p.source === 'paczkomat')!;
    // day 3 starts at km 160; the locker is 75 km in at 16 km/h from 08:00
    expect(pickup.estimatedArrivalHour).toBeCloseTo(8 + 75 / 16, 5);
  });
});

describe('generateUnifiedPlan without shipping', () => {
  it('ignores lockers even if the caller passes them', () => {
    const plan = generateUnifiedPlan(profile, days, points, [], null, config);
    expect(plan.shipping).toBeNull();
    expect(plan.resupply.purchases.map((p) => p.stopId)).toEqual(['z']);
  });
});
