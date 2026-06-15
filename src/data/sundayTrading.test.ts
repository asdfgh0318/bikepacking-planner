import { describe, it, expect } from 'vitest';
import {
  isClosedOnNonTradingSunday,
  isTradingSunday,
  tradingSundaysFor,
} from './sundayTrading';
import type { SupplyPoint } from '../types';

function makeStop(overrides: Partial<SupplyPoint> & Pick<SupplyPoint, 'type'>): SupplyPoint {
  return {
    id: 'x',
    name: 'x',
    lat: 0,
    lng: 0,
    distanceFromStartKm: 0,
    ...overrides,
  };
}

describe('tradingSundaysFor', () => {
  it('matches the known 2025 calendar', () => {
    expect(tradingSundaysFor(2025)).toEqual([
      '2025-01-26', // last Sunday of January
      '2025-04-13', // Palm Sunday (Easter April 20)
      '2025-04-27', // last Sunday of April
      '2025-06-29', // last Sunday of June
      '2025-08-31', // last Sunday of August
      '2025-12-14', // two Sundays before Christmas
      '2025-12-21', // Sunday before Christmas
    ]);
  });

  it('matches the known 2026 calendar', () => {
    expect(tradingSundaysFor(2026)).toEqual([
      '2026-01-25',
      '2026-03-29', // Palm Sunday (Easter April 5)
      '2026-04-26',
      '2026-06-28',
      '2026-08-30',
      '2026-12-13',
      '2026-12-20',
    ]);
  });

  it('keeps working past the old hardcoded range (2027)', () => {
    const sundays = tradingSundaysFor(2027);
    expect(sundays).toHaveLength(7);
    expect(sundays).toContain('2027-01-31'); // last Sunday of January 2027
    expect(sundays).toContain('2027-03-21'); // Palm Sunday (Easter March 28)
    // Christmas 2027 is a Saturday; the two Sundays before are Dec 12 + 19
    expect(sundays).toContain('2027-12-19');
    expect(sundays).toContain('2027-12-12');
    // every result is actually a Sunday
    for (const s of sundays) {
      expect(new Date(`${s}T12:00:00Z`).getUTCDay()).toBe(0);
    }
  });

  it('handles Christmas falling on a Sunday (2033)', () => {
    const sundays = tradingSundaysFor(2033);
    // Dec 25 2033 is a Sunday and is NOT a trading day; the two before are
    expect(sundays).not.toContain('2033-12-25');
    expect(sundays).toContain('2033-12-18');
    expect(sundays).toContain('2033-12-11');
  });
});

describe('isTradingSunday', () => {
  it('recognises trading Sundays', () => {
    expect(isTradingSunday('2025-12-21')).toBe(true);
    expect(isTradingSunday('2026-08-30')).toBe(true);
    expect(isTradingSunday('2027-01-31')).toBe(true);
  });

  it('rejects ordinary Sundays and non-Sundays', () => {
    expect(isTradingSunday('2025-02-02')).toBe(false); // ordinary Sunday
    expect(isTradingSunday('2025-12-22')).toBe(false); // Monday
    expect(isTradingSunday('2027-06-06')).toBe(false); // ordinary Sunday in 2027
  });

  it('tolerates malformed input without computing a calendar', () => {
    expect(isTradingSunday('')).toBe(false); // Number('') === 0 — must not compute year 0
    expect(isTradingSunday('not-a-date')).toBe(false);
    expect(isTradingSunday('0000-01-26')).toBe(false);
  });
});

describe('isClosedOnNonTradingSunday', () => {
  it('closes Biedronka via type (no brand flag needed)', () => {
    expect(isClosedOnNonTradingSunday(makeStop({ type: 'biedronka' }))).toBe(true);
  });

  it('closes a Lidl/Kaufland/Auchan/etc. via the per-store brand flag', () => {
    const lidl = makeStop({ type: 'supermarket', details: { brand: 'Lidl', closedOnNonTradingSunday: true } });
    expect(isClosedOnNonTradingSunday(lidl)).toBe(true);
  });

  it('keeps franchise chains open', () => {
    expect(isClosedOnNonTradingSunday(makeStop({ type: 'zabka' }))).toBe(false);
    const lewiatan = makeStop({ type: 'supermarket', details: { brand: 'Lewiatan' } });
    expect(isClosedOnNonTradingSunday(lewiatan)).toBe(false);
  });

  it("doesn't sweep up untagged generic supermarkets", () => {
    // A shop=supermarket without brand:wikidata stays open — we won't fire
    // a Sunday closure on something we can't identify as a covered chain.
    const generic = makeStop({ type: 'supermarket', details: { brand: 'Local Sklep' } });
    expect(isClosedOnNonTradingSunday(generic)).toBe(false);
  });

  it('leaves convenience/water/repair/etc. open', () => {
    expect(isClosedOnNonTradingSunday(makeStop({ type: 'convenience' }))).toBe(false);
    expect(isClosedOnNonTradingSunday(makeStop({ type: 'water' }))).toBe(false);
    expect(isClosedOnNonTradingSunday(makeStop({ type: 'bakery' }))).toBe(false);
  });
});
