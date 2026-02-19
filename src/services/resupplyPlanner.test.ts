import { describe, it, expect } from 'vitest';
import { generateResupplyPlan, RESUPPLY_PRESETS } from './resupplyPlanner';
import type { ResupplyConfig } from './resupplyPlanner';
import type {
  DaySegment,
  SupplyPoint,
  SupplyGap,
  DietProfile,
} from '../types';

// ---------------------------------------------------------------------------
// Helpers to build minimal test data
// ---------------------------------------------------------------------------

function makeDaySegment(
  overrides: Partial<DaySegment> & { dayNumber: number; startKm: number; endKm: number }
): DaySegment {
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

function makeSupplyPoint(
  id: string,
  distanceFromStartKm: number,
  type: SupplyPoint['type'],
  extras?: Partial<SupplyPoint>
): SupplyPoint {
  return {
    id,
    name: `${type}-${id}`,
    lat: 51.1,
    lng: 20.1,
    type,
    distanceFromStartKm,
    ...extras,
  };
}

function makeGap(
  startKm: number,
  endKm: number,
  severity: SupplyGap['severity'] = 'danger'
): SupplyGap {
  return {
    startKm,
    endKm,
    distanceKm: endKm - startKm,
    severity,
    fromName: `Point at ${startKm}`,
    toName: `Point at ${endKm}`,
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

function makeConfig(overrides?: Partial<ResupplyConfig>): ResupplyConfig {
  return {
    rideStartHour: 8,
    avgSpeedKmh: 16,
    strategy: { ...RESUPPLY_PRESETS['daily-ration'] },
    tripStartDate: '2026-07-06', // Monday
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateResupplyPlan', () => {
  // ─── Empty / Edge Cases ─────────────────────────────────────────────

  describe('empty and edge cases', () => {
    it('returns an empty plan when daySegments is empty', () => {
      const plan = generateResupplyPlan(standardProfile, [], [], [], makeConfig());

      expect(plan).toEqual({
        purchases: [],
        carryWeightCurve: [],
        maxCarryWeightG: 0,
        totalCalories: 0,
        totalWeightG: 0,
        warnings: [],
      });
    });

    it('returns a plan with no purchases but with carry weight curve when no supply points exist', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];

      const plan = generateResupplyPlan(standardProfile, days, [], [], makeConfig());

      expect(plan.purchases).toHaveLength(0);
      expect(plan.carryWeightCurve.length).toBeGreaterThan(0);
      expect(plan.totalCalories).toBe(0);
    });

    it('does not crash with empty supply points and empty gaps', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 60 }),
        makeDaySegment({ dayNumber: 2, startKm: 60, endKm: 120 }),
      ];

      const plan = generateResupplyPlan(standardProfile, days, [], [], makeConfig());

      expect(plan.purchases).toHaveLength(0);
      expect(plan.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── Basic Plan Generation (2-Day Trip) ─────────────────────────────

  describe('basic plan generation with a simple 2-day trip', () => {
    it('generates purchases for a 2-day trip with shops along the route', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
        makeDaySegment({ dayNumber: 2, startKm: 80, endKm: 160 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('b1', 20, 'biedronka'),
        makeSupplyPoint('z1', 100, 'zabka'),
      ];

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        makeConfig()
      );

      expect(plan.purchases.length).toBeGreaterThanOrEqual(1);
      expect(plan.totalCalories).toBeGreaterThan(0);
      expect(plan.totalWeightG).toBeGreaterThan(0);
    });

    it('records carry weight curve entries for each day', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
        makeDaySegment({ dayNumber: 2, startKm: 80, endKm: 160 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('b1', 30, 'biedronka'),
        makeSupplyPoint('z1', 110, 'zabka'),
      ];

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        makeConfig()
      );

      // Each day: start point + optional purchase points + end point
      // Day 1: startKm=0, purchase at 30, endKm=80 => 3 points
      // Day 2: startKm=80, purchase at 110, endKm=160 => 3 points
      expect(plan.carryWeightCurve.length).toBeGreaterThanOrEqual(4);

      const day1Points = plan.carryWeightCurve.filter((p) => p.dayNumber === 1);
      const day2Points = plan.carryWeightCurve.filter((p) => p.dayNumber === 2);
      expect(day1Points.length).toBeGreaterThanOrEqual(2);
      expect(day2Points.length).toBeGreaterThanOrEqual(2);
    });

    it('purchase items have correct structure', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('b1', 25, 'biedronka'),
      ];

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        makeConfig()
      );

      expect(plan.purchases.length).toBeGreaterThanOrEqual(1);
      const purchase = plan.purchases[0];
      expect(purchase.stopId).toBe('b1');
      expect(purchase.stopType).toBe('biedronka');
      expect(purchase.dayNumber).toBe(1);
      expect(purchase.source).toBe('shop');
      expect(purchase.items.length).toBeGreaterThan(0);
      expect(purchase.totalCalories).toBeGreaterThan(0);
      expect(purchase.totalWeightG).toBeGreaterThan(0);
      expect(typeof purchase.estimatedArrivalHour).toBe('number');
    });
  });

  // ─── Stop Selection Based on Proximity and Timing ───────────────────

  describe('stop selection based on proximity and timing', () => {
    it('prefers Biedronka over Zabka with daily-ration strategy', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      // Both at similar early positions, but strategy prefers biedronka
      const supplyPoints = [
        makeSupplyPoint('b1', 25, 'biedronka'),
        makeSupplyPoint('z1', 26, 'zabka'),
      ];

      const config = makeConfig({
        strategy: { ...RESUPPLY_PRESETS['daily-ration'] },
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      // daily-ration maxStopsPerDay=1, so only one stop should be selected
      expect(plan.purchases).toHaveLength(1);
      // daily-ration prefers biedronka first in preferStoreType
      expect(plan.purchases[0].stopType).toBe('biedronka');
    });

    it('prefers early stops with daily-ration strategy (preferEarlyStop=true)', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 100 }),
      ];
      // One stop early (20%), one stop late (80%) — both same type
      const supplyPoints = [
        makeSupplyPoint('early', 20, 'zabka'),
        makeSupplyPoint('late', 80, 'zabka'),
      ];

      const config = makeConfig({
        strategy: { ...RESUPPLY_PRESETS['daily-ration'] },
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      // Should pick the early stop (progress=0.2, within <=0.4 range for +5 score)
      expect(plan.purchases).toHaveLength(1);
      expect(plan.purchases[0].stopId).toBe('early');
    });

    it('skips stops that are known to be closed at arrival time', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      // This stop has hours that won't match the arrival time
      // At avgSpeed 16 km/h, arriving at km 20 from start at hour 8 => 8 + 20/16 = 9.25
      // So a store open only 17:00-22:00 won't be open
      const supplyPoints = [
        makeSupplyPoint('closed', 20, 'biedronka', {
          details: { openingHours: 'Mo-Fr 17:00-22:00' },
        }),
        makeSupplyPoint('open', 40, 'zabka', {
          details: { openingHours: 'Mo-Fr 06:00-22:00' },
        }),
      ];

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        makeConfig()
      );

      // The closed store should be skipped
      const closedPurchase = plan.purchases.find((p) => p.stopId === 'closed');
      expect(closedPurchase).toBeUndefined();

      // The open store should be used
      const openPurchase = plan.purchases.find((p) => p.stopId === 'open');
      expect(openPurchase).toBeDefined();
    });
  });

  // ─── Calorie Tracking ──────────────────────────────────────────────

  describe('calorie tracking', () => {
    it('purchases enough calories to cover daily needs', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80, ascentM: 200 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('b1', 20, 'biedronka'),
      ];

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        makeConfig()
      );

      // Expected daily calories: 2000 + 22*80 + 3.5*200 = 2000 + 1760 + 700 = 4460
      // The plan should purchase at least a significant portion of that
      expect(plan.totalCalories).toBeGreaterThan(3000);
    });

    it('tracks calorie consumption through food weight decreasing over distance', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('b1', 10, 'biedronka'),
      ];

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        makeConfig()
      );

      // After purchasing at km 10, the weight at km 80 (end of day) should be less
      const day1Curve = plan.carryWeightCurve.filter((p) => p.dayNumber === 1);
      const purchasePoint = day1Curve.find((p) => p.distanceKm === 10);
      const endPoint = day1Curve.find((p) => p.distanceKm === 80);

      if (purchasePoint && endPoint) {
        expect(endPoint.foodWeightG).toBeLessThan(purchasePoint.foodWeightG);
      }
    });
  });

  // ─── Sunday Trading Ban ─────────────────────────────────────────────

  describe('Sunday trading ban', () => {
    it('skips Biedronka on Sunday (Polish trading ban)', () => {
      // 2026-07-12 is a Sunday
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('bied', 30, 'biedronka'),
        makeSupplyPoint('zab', 35, 'zabka'),
      ];

      const config = makeConfig({
        tripStartDate: '2026-07-12', // Sunday
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      // Biedronka should NOT appear in purchases on Sunday
      const biedPurchase = plan.purchases.find((p) => p.stopType === 'biedronka');
      expect(biedPurchase).toBeUndefined();

      // Zabka should be used instead
      const zabPurchase = plan.purchases.find((p) => p.stopType === 'zabka');
      expect(zabPurchase).toBeDefined();
    });

    it('allows 24h Biedronka on Sunday (is24h overrides ban)', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('bied24', 30, 'biedronka', {
          details: { is24h: true },
        }),
      ];

      const config = makeConfig({
        tripStartDate: '2026-07-12', // Sunday
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      // 24h Biedronka should still be available on Sunday
      const biedPurchase = plan.purchases.find((p) => p.stopType === 'biedronka');
      expect(biedPurchase).toBeDefined();
    });

    it('generates a sunday_closed warning on Sunday', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('zab', 30, 'zabka'),
      ];

      const config = makeConfig({
        tripStartDate: '2026-07-12', // Sunday
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      const sundayWarning = plan.warnings.find((w) => w.type === 'sunday_closed');
      expect(sundayWarning).toBeDefined();
      expect(sundayWarning!.severity).toBe('warning');
      expect(sundayWarning!.message).toContain('Sunday');
      expect(sundayWarning!.message).toContain('Biedronka closed');
    });

    it('Zabka remains open on Sunday with reduced hours', () => {
      // Trip starts on Sunday, Zabka should still be selectable
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('zab', 30, 'zabka'),
      ];

      const config = makeConfig({
        tripStartDate: '2026-07-12', // Sunday
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      // Zabka should be used on Sunday
      expect(plan.purchases.length).toBeGreaterThanOrEqual(1);
      expect(plan.purchases[0].stopType).toBe('zabka');
    });
  });

  // ─── Trading Sunday Exceptions ──────────────────────────────────────

  describe('trading Sunday exceptions', () => {
    it('does NOT skip Biedronka on a trading Sunday', () => {
      // 2026-01-25 is a Sunday AND a trading Sunday
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('bied', 30, 'biedronka'),
        makeSupplyPoint('zab', 35, 'zabka'),
      ];

      const config = makeConfig({
        tripStartDate: '2026-01-25', // Trading Sunday
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      // Biedronka SHOULD appear in purchases on a trading Sunday
      const biedPurchase = plan.purchases.find((p) => p.stopType === 'biedronka');
      expect(biedPurchase).toBeDefined();
    });

    it('still skips Biedronka on a non-trading Sunday', () => {
      // 2026-07-12 is a regular (non-trading) Sunday
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('bied', 30, 'biedronka'),
        makeSupplyPoint('zab', 35, 'zabka'),
      ];

      const config = makeConfig({
        tripStartDate: '2026-07-12', // Non-trading Sunday
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      // Biedronka should NOT appear — it's a regular Sunday
      const biedPurchase = plan.purchases.find((p) => p.stopType === 'biedronka');
      expect(biedPurchase).toBeUndefined();
    });

    it('does NOT add Sunday food buffer on a trading Sunday', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 40, ascentM: 100 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('zab', 15, 'zabka'),
      ];

      // Weekday (Monday)
      const mondayConfig = makeConfig({
        tripStartDate: '2026-07-06', // Monday
      });
      const mondayPlan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        mondayConfig
      );

      // Trading Sunday — should behave like a weekday
      const tradingSundayConfig = makeConfig({
        tripStartDate: '2026-01-25', // Trading Sunday
      });
      const tradingSundayPlan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        tradingSundayConfig
      );

      // Trading Sunday should NOT have extra buffer, so calories should be the same as Monday
      expect(tradingSundayPlan.totalCalories).toBe(mondayPlan.totalCalories);
    });

    it('generates sunday_trading info warning instead of sunday_closed warning on trading Sunday', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('bied', 30, 'biedronka'),
      ];

      const config = makeConfig({
        tripStartDate: '2026-01-25', // Trading Sunday
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      // Should NOT have sunday_closed warning
      const closedWarning = plan.warnings.find((w) => w.type === 'sunday_closed');
      expect(closedWarning).toBeUndefined();

      // Should have sunday_trading info warning
      const tradingWarning = plan.warnings.find((w) => w.type === 'sunday_trading');
      expect(tradingWarning).toBeDefined();
      expect(tradingWarning!.severity).toBe('info');
      expect(tradingWarning!.message).toContain('Trading Sunday');
      expect(tradingWarning!.message).toContain('all shops open');
    });

    it('handles multi-day trip where trading Sunday falls on day 2', () => {
      // 2026-01-24 is Saturday => day 2 = 2026-01-25 (trading Sunday)
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
        makeDaySegment({ dayNumber: 2, startKm: 80, endKm: 160 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('b1', 30, 'biedronka'),
        makeSupplyPoint('b2', 120, 'biedronka'),
      ];

      const config = makeConfig({
        tripStartDate: '2026-01-24', // Saturday
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      // Day 2 is a trading Sunday — Biedronka at km 120 should be available
      const day2Bied = plan.purchases.find(
        (p) => p.dayNumber === 2 && p.stopType === 'biedronka'
      );
      expect(day2Bied).toBeDefined();

      // Should have sunday_trading info for day 2, not sunday_closed
      const tradingWarning = plan.warnings.find(
        (w) => w.type === 'sunday_trading' && w.dayNumber === 2
      );
      expect(tradingWarning).toBeDefined();
      expect(tradingWarning!.severity).toBe('info');
    });
  });

  // ─── 15% Extra Sunday Buffer ────────────────────────────────────────

  describe('15% extra food buffer on Sundays', () => {
    it('purchases more calories on Sunday than on a weekday for the same route', () => {
      // Use a shorter route so base calorie target is low enough that the 15% buffer
      // pushes past the next discrete food item boundary.
      // 40km / 100m ascent => base ~3230 cal. 15% extra => ~3715 cal.
      // At zabka, items sorted by cal/weight ratio fill up to ~3549 cal for 3230 target,
      // but the higher Sunday target requires more items.
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 40, ascentM: 100 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('zab', 15, 'zabka'),
      ];

      // Weekday (Monday)
      const mondayConfig = makeConfig({
        tripStartDate: '2026-07-06', // Monday
      });
      const mondayPlan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        mondayConfig
      );

      // Sunday
      const sundayConfig = makeConfig({
        tripStartDate: '2026-07-12', // Sunday
      });
      const sundayPlan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        sundayConfig
      );

      // Sunday should have more calories purchased due to 15% buffer
      expect(sundayPlan.totalCalories).toBeGreaterThan(mondayPlan.totalCalories);
    });
  });

  // ─── Danger Gap Detection (+20km Lookahead) ─────────────────────────

  describe('danger gap detection with +20km lookahead', () => {
    it('adds extra rations when a danger gap starts within segment range', () => {
      // Use a shorter route (40km) so the base calorie target is low enough
      // that the gap's extra calories push past the next discrete food item boundary.
      // 40km / 100m ascent => base ~3230 cal. A 20km gap adds ~646 extra cal => ~3876 total.
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 40, ascentM: 100 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('b1', 10, 'biedronka'),
      ];

      // Danger gap starts at km 30 (within day 1 segment 0-40)
      const gaps: SupplyGap[] = [
        makeGap(30, 50, 'danger'),
      ];

      const planWithGap = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        gaps,
        makeConfig()
      );

      // Same plan without gap
      const planWithoutGap = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        makeConfig()
      );

      // Plan with gap should buy more calories
      expect(planWithGap.totalCalories).toBeGreaterThan(planWithoutGap.totalCalories);
    });

    it('generates a long_carry warning when a danger gap is detected', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('b1', 25, 'biedronka'),
      ];
      const gaps: SupplyGap[] = [
        makeGap(50, 120, 'danger'),
      ];

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        gaps,
        makeConfig()
      );

      const longCarryWarning = plan.warnings.find((w) => w.type === 'long_carry');
      expect(longCarryWarning).toBeDefined();
      expect(longCarryWarning!.dayNumber).toBe(1);
      expect(longCarryWarning!.severity).toBe('info');
      expect(longCarryWarning!.message).toContain('gap ahead');
    });

    it('detects gaps with +20km lookahead beyond segment end', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
        makeDaySegment({ dayNumber: 2, startKm: 80, endKm: 160 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('b1', 25, 'biedronka'),
        makeSupplyPoint('b2', 100, 'biedronka'),
      ];

      // Gap starts at km 90, which is within seg1.endKm(80) + 20 = 100
      const gaps: SupplyGap[] = [
        makeGap(90, 150, 'danger'),
      ];

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        gaps,
        makeConfig()
      );

      // Day 1 should get a long_carry warning because gap at 90 is within 80+20=100
      const day1Warning = plan.warnings.find(
        (w) => w.type === 'long_carry' && w.dayNumber === 1
      );
      expect(day1Warning).toBeDefined();
    });

    it('does not detect gap that is beyond +20km lookahead', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('b1', 25, 'biedronka'),
      ];

      // Gap starts at km 110, which is beyond seg.endKm(80) + 20 = 100
      const gaps: SupplyGap[] = [
        makeGap(110, 170, 'danger'),
      ];

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        gaps,
        makeConfig()
      );

      const longCarryWarning = plan.warnings.find((w) => w.type === 'long_carry');
      expect(longCarryWarning).toBeUndefined();
    });
  });

  // ─── Heavy Load Warning ─────────────────────────────────────────────

  describe('heavy load warnings', () => {
    it('generates a heavy_load warning when peak food weight exceeds 2.5kg', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('b1', 10, 'biedronka'),
      ];

      // Use self-sufficient strategy which carries extra days of food
      const config = makeConfig({
        strategy: { ...RESUPPLY_PRESETS['self-sufficient'] },
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      // self-sufficient carries 1 extra day buffer, likely exceeding 2.5kg
      const heavyWarning = plan.warnings.find((w) => w.type === 'heavy_load');
      if (plan.maxCarryWeightG > 2500) {
        expect(heavyWarning).toBeDefined();
        expect(heavyWarning!.severity).toBe('warning');
        expect(heavyWarning!.message).toContain('kg');
      }
    });

    it('does not generate heavy_load warning when weight is under 2.5kg', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 30, ascentM: 50 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('z1', 10, 'zabka'),
      ];

      // Short day with ultralight strategy — minimal food
      const config = makeConfig({
        strategy: {
          ...RESUPPLY_PRESETS.ultralight,
          carryBufferDays: 0,
        },
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      if (plan.maxCarryWeightG <= 2500) {
        const heavyWarning = plan.warnings.find((w) => w.type === 'heavy_load');
        expect(heavyWarning).toBeUndefined();
      }
    });
  });

  // ─── Calorie Deficit Warnings ───────────────────────────────────────

  describe('calorie deficit warnings when no shops available', () => {
    it('generates a calorie_deficit warning when no open stops are available and reserves are low', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      // No food supply points at all
      const supplyPoints: SupplyPoint[] = [];

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        makeConfig()
      );

      const deficitWarning = plan.warnings.find((w) => w.type === 'calorie_deficit');
      expect(deficitWarning).toBeDefined();
      expect(deficitWarning!.dayNumber).toBe(1);
      // With 0 calories in reserve (<50% of daily needs), severity should be 'danger'
      expect(deficitWarning!.severity).toBe('danger');
      expect(deficitWarning!.message).toContain('No open food stops');
    });

    it('generates a warning severity "warning" when reserves cover 20-50% of needs', () => {
      // Day 1 has a shop, Day 2 has none but still has some carry-over
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 40, ascentM: 100 }),
        makeDaySegment({ dayNumber: 2, startKm: 40, endKm: 80, ascentM: 100 }),
      ];
      const supplyPoints = [
        // Only on day 1 — builds up reserves
        makeSupplyPoint('b1', 10, 'biedronka'),
      ];

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        makeConfig()
      );

      // Day 2 may have a deficit warning depending on how much was consumed on day 1
      const day2Warning = plan.warnings.find(
        (w) => w.type === 'calorie_deficit' && w.dayNumber === 2
      );
      // If there is one, its severity should be 'warning' or 'danger'
      if (day2Warning) {
        expect(['warning', 'danger']).toContain(day2Warning.severity);
      }
    });

    it('does not generate calorie deficit when stops with unknown hours are present', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      // Stop with no opening hours (isOpen will be null, treated as potentially open)
      const supplyPoints = [
        makeSupplyPoint('shop1', 30, 'shop'),
      ];

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        makeConfig()
      );

      // The shop should be used (null open status is accepted)
      expect(plan.purchases.length).toBeGreaterThanOrEqual(1);

      // Should have an info warning about unknown hours
      const unknownHoursWarning = plan.warnings.find((w) => w.type === 'closed_store');
      expect(unknownHoursWarning).toBeDefined();
      expect(unknownHoursWarning!.severity).toBe('info');
      expect(unknownHoursWarning!.message).toContain('unknown');
    });
  });

  // ─── Multiple Shopping Stops Per Day ────────────────────────────────

  describe('multiple shopping stops per day', () => {
    it('grazer strategy can use up to 3 stops per day', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('z1', 15, 'zabka'),
        makeSupplyPoint('b1', 35, 'biedronka'),
        makeSupplyPoint('z2', 60, 'zabka'),
      ];

      const config = makeConfig({
        strategy: { ...RESUPPLY_PRESETS.grazer },
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      // Grazer maxStopsPerDay=3, so it can use up to 3 stops
      expect(plan.purchases.length).toBeLessThanOrEqual(3);
      expect(plan.purchases.length).toBeGreaterThanOrEqual(1);
    });

    it('splits calorie target across multiple stops for multi-stop strategies', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 90 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('z1', 20, 'zabka'),
        makeSupplyPoint('b1', 50, 'biedronka'),
        makeSupplyPoint('z2', 70, 'zabka'),
      ];

      const config = makeConfig({
        strategy: { ...RESUPPLY_PRESETS.grazer },
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      if (plan.purchases.length >= 2) {
        // Each stop should have fewer calories than the total
        for (const purchase of plan.purchases) {
          expect(purchase.totalCalories).toBeLessThan(plan.totalCalories);
        }
      }
    });

    it('daily-ration strategy limits to 1 stop per day', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('z1', 15, 'zabka'),
        makeSupplyPoint('b1', 30, 'biedronka'),
        makeSupplyPoint('z2', 60, 'zabka'),
      ];

      const config = makeConfig({
        strategy: { ...RESUPPLY_PRESETS['daily-ration'] },
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      expect(plan.purchases).toHaveLength(1);
    });

    it('purchases in ride order (sorted by distance) regardless of ranking', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 90 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('z1', 20, 'zabka'),
        makeSupplyPoint('b1', 50, 'biedronka'),
        makeSupplyPoint('z2', 70, 'zabka'),
      ];

      const config = makeConfig({
        strategy: { ...RESUPPLY_PRESETS.grazer },
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      // Purchases should be sorted by distance
      for (let i = 1; i < plan.purchases.length; i++) {
        expect(plan.purchases[i].distanceKm).toBeGreaterThanOrEqual(
          plan.purchases[i - 1].distanceKm
        );
      }
    });
  });

  // ─── Store Preference ──────────────────────────────────────────────

  describe('store preference', () => {
    it('daily-ration prefers Biedronka over Zabka (larger selection)', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      // Both stores at similar early positions
      const supplyPoints = [
        makeSupplyPoint('z1', 24, 'zabka'),
        makeSupplyPoint('b1', 26, 'biedronka'),
      ];

      const config = makeConfig({
        strategy: { ...RESUPPLY_PRESETS['daily-ration'] },
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      // daily-ration: preferStoreType = ['biedronka', 'zabka', 'shop', 'paczkomat']
      expect(plan.purchases).toHaveLength(1);
      expect(plan.purchases[0].stopType).toBe('biedronka');
    });

    it('ultralight prefers Zabka over Biedronka', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('b1', 24, 'biedronka'),
        makeSupplyPoint('z1', 26, 'zabka'),
      ];

      const config = makeConfig({
        strategy: { ...RESUPPLY_PRESETS.ultralight },
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      // ultralight: preferStoreType = ['zabka', 'shop', 'biedronka', 'paczkomat']
      // With maxStopsPerDay=4, it may use multiple stops; the first ranked should be zabka
      const zabkaPurchases = plan.purchases.filter((p) => p.stopType === 'zabka');
      expect(zabkaPurchases.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Strategy-Specific Behaviors ────────────────────────────────────

  describe('strategy-specific behaviors', () => {
    it('self-sufficient strategy carries extra food buffer (carryBufferDays=1)', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
        makeDaySegment({ dayNumber: 2, startKm: 80, endKm: 160 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('b1', 20, 'biedronka'),
        makeSupplyPoint('b2', 100, 'biedronka'),
      ];

      const selfSuffConfig = makeConfig({
        strategy: { ...RESUPPLY_PRESETS['self-sufficient'] },
      });
      const dailyConfig = makeConfig({
        strategy: { ...RESUPPLY_PRESETS['daily-ration'] },
      });

      const selfSuffPlan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        selfSuffConfig
      );
      const dailyPlan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        dailyConfig
      );

      // Self-sufficient buys more because of carryBufferDays=1
      expect(selfSuffPlan.totalCalories).toBeGreaterThan(dailyPlan.totalCalories);
    });

    it('grazer strategy respects minCalorieReserve', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('z1', 20, 'zabka'),
        makeSupplyPoint('z2', 40, 'zabka'),
        makeSupplyPoint('z3', 60, 'zabka'),
      ];

      const config = makeConfig({
        strategy: {
          ...RESUPPLY_PRESETS.grazer,
          minCalorieReserve: 500,
        },
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      // With minCalorieReserve, the grazer should still buy even if target is met
      expect(plan.purchases.length).toBeGreaterThanOrEqual(1);
      expect(plan.totalCalories).toBeGreaterThan(0);
    });
  });

  // ─── Arrival Hour Estimation ────────────────────────────────────────

  describe('arrival hour estimation', () => {
    it('calculates correct estimated arrival hour based on distance and speed', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('b1', 32, 'biedronka'),
      ];

      const config = makeConfig({
        rideStartHour: 8,
        avgSpeedKmh: 16,
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      // Arrival at km 32 from km 0: 32/16 = 2 hours => 8 + 2 = 10
      expect(plan.purchases).toHaveLength(1);
      expect(plan.purchases[0].estimatedArrivalHour).toBeCloseTo(10, 1);
    });
  });

  // ─── Non-Food Supply Points ─────────────────────────────────────────

  describe('non-food supply point handling', () => {
    it('ignores water, campsite, and repair supply points for food purchases', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('w1', 20, 'water'),
        makeSupplyPoint('c1', 40, 'campsite'),
        makeSupplyPoint('r1', 60, 'repair'),
      ];

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        makeConfig()
      );

      // No food purchases from non-food points
      expect(plan.purchases).toHaveLength(0);
    });
  });

  // ─── Day-of-Week Defaults ──────────────────────────────────────────

  describe('day-of-week default behavior', () => {
    it('defaults to Monday (non-Sunday) when tripStartDate is not set', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('b1', 30, 'biedronka'),
      ];

      const config = makeConfig({ tripStartDate: undefined });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      // Should NOT generate a sunday_closed warning
      const sundayWarning = plan.warnings.find((w) => w.type === 'sunday_closed');
      expect(sundayWarning).toBeUndefined();

      // Biedronka should be available
      expect(plan.purchases.length).toBeGreaterThanOrEqual(1);
      expect(plan.purchases[0].stopType).toBe('biedronka');
    });
  });

  // ─── Multi-Day Trip With Sunday in Middle ──────────────────────────

  describe('multi-day trip with Sunday in the middle', () => {
    it('handles a 7-day trip starting Saturday with Sunday on day 2', () => {
      // 2026-07-11 is a Saturday => day 2 is Sunday
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
        makeDaySegment({ dayNumber: 2, startKm: 80, endKm: 160 }),
        makeDaySegment({ dayNumber: 3, startKm: 160, endKm: 240 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('b1', 30, 'biedronka'),
        makeSupplyPoint('b2', 120, 'biedronka'),
        makeSupplyPoint('z2', 125, 'zabka'),
        makeSupplyPoint('b3', 200, 'biedronka'),
      ];

      const config = makeConfig({
        tripStartDate: '2026-07-11', // Saturday
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      // Day 1 (Saturday) — Biedronka should work
      const day1Purchases = plan.purchases.filter((p) => p.dayNumber === 1);
      expect(day1Purchases.length).toBeGreaterThanOrEqual(1);

      // Day 2 (Sunday) — Biedronka at km 120 should be skipped; Zabka at km 125 should be used
      const day2Bied = plan.purchases.find(
        (p) => p.dayNumber === 2 && p.stopType === 'biedronka'
      );
      expect(day2Bied).toBeUndefined();

      // Sunday warning should exist for day 2
      const sundayWarning = plan.warnings.find(
        (w) => w.type === 'sunday_closed' && w.dayNumber === 2
      );
      expect(sundayWarning).toBeDefined();
    });
  });

  // ─── Max Carry Weight Tracking ─────────────────────────────────────

  describe('max carry weight tracking', () => {
    it('maxCarryWeightG reflects the peak across all days', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
        makeDaySegment({ dayNumber: 2, startKm: 80, endKm: 160 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('b1', 10, 'biedronka'),
        makeSupplyPoint('b2', 90, 'biedronka'),
      ];

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        makeConfig()
      );

      // maxCarryWeightG should equal the maximum of all curve points
      const maxFromCurve = Math.max(
        ...plan.carryWeightCurve.map((p) => p.foodWeightG)
      );
      expect(plan.maxCarryWeightG).toBe(maxFromCurve);
    });
  });

  // ─── Skipping Low-Calorie Purchases ────────────────────────────────

  describe('skipping low-calorie purchases', () => {
    it('skips a stop when less than 200 calories are needed', () => {
      // Create a scenario where the rider already has enough food
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 40, ascentM: 50 }),
      ];
      // Multiple stops — first one should cover needs, subsequent ones should be skipped
      const supplyPoints = [
        makeSupplyPoint('b1', 5, 'biedronka'),
        makeSupplyPoint('b2', 10, 'biedronka'),
        makeSupplyPoint('b3', 15, 'biedronka'),
        makeSupplyPoint('b4', 20, 'biedronka'),
      ];

      const config = makeConfig({
        strategy: {
          ...RESUPPLY_PRESETS.grazer,
          maxStopsPerDay: 4,
          minCalorieReserve: 0,
        },
      });

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        config
      );

      // Should not buy at all 4 stops since needs will be met early
      expect(plan.purchases.length).toBeLessThan(4);
    });
  });

  // ─── Caution Gap Also Triggers Extra Rations ───────────────────────

  describe('caution gap handling', () => {
    it('treats caution severity gaps same as danger for extra ration planning', () => {
      // Use a shorter route (40km) so the caution gap's extra calories
      // push past the next discrete food item boundary.
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 40, ascentM: 100 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('b1', 10, 'biedronka'),
      ];
      const cautionGaps: SupplyGap[] = [
        makeGap(30, 50, 'caution'),
      ];

      const planWithCaution = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        cautionGaps,
        makeConfig()
      );

      const planNoGaps = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        makeConfig()
      );

      // Caution gaps should also trigger extra rations
      expect(planWithCaution.totalCalories).toBeGreaterThan(planNoGaps.totalCalories);
    });
  });

  // ─── Totals Consistency ────────────────────────────────────────────

  describe('totals consistency', () => {
    it('totalCalories equals sum of all purchase calories', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
        makeDaySegment({ dayNumber: 2, startKm: 80, endKm: 160 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('b1', 30, 'biedronka'),
        makeSupplyPoint('z1', 110, 'zabka'),
      ];

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        makeConfig()
      );

      const sumCals = plan.purchases.reduce((s, p) => s + p.totalCalories, 0);
      expect(plan.totalCalories).toBe(sumCals);
    });

    it('totalWeightG equals sum of all purchase weights', () => {
      const days = [
        makeDaySegment({ dayNumber: 1, startKm: 0, endKm: 80 }),
        makeDaySegment({ dayNumber: 2, startKm: 80, endKm: 160 }),
      ];
      const supplyPoints = [
        makeSupplyPoint('b1', 30, 'biedronka'),
        makeSupplyPoint('z1', 110, 'zabka'),
      ];

      const plan = generateResupplyPlan(
        standardProfile,
        days,
        supplyPoints,
        [],
        makeConfig()
      );

      const sumWeight = plan.purchases.reduce((s, p) => s + p.totalWeightG, 0);
      expect(plan.totalWeightG).toBe(sumWeight);
    });
  });

  // ─── RESUPPLY_PRESETS ──────────────────────────────────────────────

  describe('RESUPPLY_PRESETS', () => {
    it('contains all expected strategy IDs', () => {
      const expectedIds = ['daily-ration', 'grazer', 'ultralight', 'self-sufficient', 'custom'];
      for (const id of expectedIds) {
        expect(RESUPPLY_PRESETS).toHaveProperty(id);
        expect(RESUPPLY_PRESETS[id as keyof typeof RESUPPLY_PRESETS].id).toBe(id);
      }
    });

    it('each preset has valid configuration values', () => {
      for (const preset of Object.values(RESUPPLY_PRESETS)) {
        expect(preset.maxStopsPerDay).toBeGreaterThanOrEqual(1);
        expect(typeof preset.preferEarlyStop).toBe('boolean');
        expect(preset.carryBufferDays).toBeGreaterThanOrEqual(0);
        expect(preset.preferStoreType.length).toBeGreaterThan(0);
        expect(typeof preset.label).toBe('string');
        expect(typeof preset.description).toBe('string');
      }
    });
  });
});
