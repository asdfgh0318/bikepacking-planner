import { describe, it, expect } from 'vitest';
import { calculateDailyCalories, DIET_PROFILES } from './diet';
import type { DietProfile, DietType } from '../types';

// ─── calculateDailyCalories ──────────────────────────────────────────

describe('calculateDailyCalories', () => {
  const standard = DIET_PROFILES.standard;

  it('returns a reasonable calorie count for a flat 80km ride', () => {
    // standard: base 2000 + 22*80 + 3.5*0 = 2000 + 1760 = 3760
    const cals = calculateDailyCalories(standard, 80, 0);

    expect(cals).toBe(3760);
    // Sanity: a day of cycling should be between 3000-5000 kcal for flat terrain
    expect(cals).toBeGreaterThan(3000);
    expect(cals).toBeLessThan(5000);
  });

  it('returns more calories for a hilly ride than a flat ride of the same distance', () => {
    const flatCals = calculateDailyCalories(standard, 80, 0);
    const hillyCals = calculateDailyCalories(standard, 80, 1000);

    // standard: base 2000 + 22*80 + 3.5*1000 = 2000 + 1760 + 3500 = 7260
    expect(hillyCals).toBe(7260);
    expect(hillyCals).toBeGreaterThan(flatCals);
    // The difference should be exactly calsPerAscentM * 1000
    expect(hillyCals - flatCals).toBe(standard.calsPerAscentM * 1000);
  });

  it('returns fewer calories for a short ride', () => {
    const shortCals = calculateDailyCalories(standard, 20, 100);
    const longCals = calculateDailyCalories(standard, 80, 100);

    expect(shortCals).toBeLessThan(longCals);
    // standard short: 2000 + 22*20 + 3.5*100 = 2000 + 440 + 350 = 2790
    expect(shortCals).toBe(2790);
  });

  it('returns rounded integer values', () => {
    // Use a profile where the math might produce a decimal
    const cals = calculateDailyCalories(standard, 33, 777);
    expect(Number.isInteger(cals)).toBe(true);
    // 2000 + 22*33 + 3.5*777 = 2000 + 726 + 2719.5 = 5445.5 -> 5446
    expect(cals).toBe(5446);
  });

  it('works correctly with the high-energy profile', () => {
    const he = DIET_PROFILES['high-energy'];
    // base 2200 + 26*80 + 4*800 = 2200 + 2080 + 3200 = 7480
    const cals = calculateDailyCalories(he, 80, 800);
    expect(cals).toBe(7480);
  });

  it('works correctly with the ultralight profile', () => {
    const ul = DIET_PROFILES.ultralight;
    // base 1800 + 18*80 + 3*0 = 1800 + 1440 = 3240
    const cals = calculateDailyCalories(ul, 80, 0);
    expect(cals).toBe(3240);
  });
});

// ─── DIET_PROFILES ───────────────────────────────────────────────────

describe('DIET_PROFILES', () => {
  const expectedTypes: DietType[] = ['standard', 'high-energy', 'ultralight', 'keto', 'vegan'];

  it('contains all expected diet types', () => {
    for (const dt of expectedTypes) {
      expect(DIET_PROFILES).toHaveProperty(dt);
    }
  });

  it.each(expectedTypes)('profile "%s" has all required properties', (dietType) => {
    const profile: DietProfile = DIET_PROFILES[dietType];

    expect(profile.type).toBe(dietType);
    expect(typeof profile.label).toBe('string');
    expect(profile.label.length).toBeGreaterThan(0);
    expect(typeof profile.description).toBe('string');
    expect(profile.description.length).toBeGreaterThan(0);

    expect(typeof profile.calsPerKm).toBe('number');
    expect(profile.calsPerKm).toBeGreaterThan(0);

    expect(typeof profile.calsPerAscentM).toBe('number');
    expect(profile.calsPerAscentM).toBeGreaterThan(0);

    expect(typeof profile.baseCalsPerDay).toBe('number');
    expect(profile.baseCalsPerDay).toBeGreaterThan(0);
  });

  it.each(expectedTypes)('profile "%s" macros sum to 100%%', (dietType) => {
    const { macros } = DIET_PROFILES[dietType];
    const total = macros.carbsPct + macros.fatPct + macros.proteinPct;
    expect(total).toBe(100);
  });

  it('high-energy profile has higher calsPerKm than ultralight', () => {
    expect(DIET_PROFILES['high-energy'].calsPerKm).toBeGreaterThan(
      DIET_PROFILES.ultralight.calsPerKm
    );
  });

  it('keto profile has high fat percentage', () => {
    expect(DIET_PROFILES.keto.macros.fatPct).toBeGreaterThanOrEqual(60);
    expect(DIET_PROFILES.keto.macros.carbsPct).toBeLessThanOrEqual(15);
  });
});
