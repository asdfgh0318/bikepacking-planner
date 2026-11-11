import { describe, it, expect } from 'vitest';
import { parseOpeningHours, isOpenAt } from './openingHours';

describe('parseOpeningHours', () => {
  it('parses standard format "Mo-Fr 06:00-22:00; Sa 07:00-21:00"', () => {
    const result = parseOpeningHours('Mo-Fr 06:00-22:00; Sa 07:00-21:00');
    expect(result).not.toBeNull();
    expect(result!.is24_7).toBe(false);
    expect(result!.ranges).toHaveLength(2);

    // Mo-Fr range: days 1,2,3,4,5
    const weekdayRange = result!.ranges[0];
    expect(weekdayRange.days).toEqual([1, 2, 3, 4, 5]);
    expect(weekdayRange.open).toBe(6);
    expect(weekdayRange.close).toBe(22);

    // Sa range: day 6
    const satRange = result!.ranges[1];
    expect(satRange.days).toEqual([6]);
    expect(satRange.open).toBe(7);
    expect(satRange.close).toBe(21);
  });

  it('parses 24/7 format "24/7"', () => {
    const result = parseOpeningHours('24/7');
    expect(result).not.toBeNull();
    expect(result!.is24_7).toBe(true);
    expect(result!.ranges).toEqual([]);
  });

  it('parses 24/7 format "24h"', () => {
    const result = parseOpeningHours('24h');
    expect(result).not.toBeNull();
    expect(result!.is24_7).toBe(true);
  });

  it('parses 24/7 format "OPEN 24H"', () => {
    const result = parseOpeningHours('OPEN 24H');
    expect(result).not.toBeNull();
    expect(result!.is24_7).toBe(true);
  });

  it('parses lunch breaks "Mo-Fr 09:00-13:00,15:00-21:00"', () => {
    const result = parseOpeningHours('Mo-Fr 09:00-13:00,15:00-21:00');
    expect(result).not.toBeNull();
    expect(result!.is24_7).toBe(false);
    // Comma-separated time ranges produce two TimeRange entries with the same days
    expect(result!.ranges).toHaveLength(2);

    expect(result!.ranges[0].days).toEqual([1, 2, 3, 4, 5]);
    expect(result!.ranges[0].open).toBe(9);
    expect(result!.ranges[0].close).toBe(13);

    expect(result!.ranges[1].days).toEqual([1, 2, 3, 4, 5]);
    expect(result!.ranges[1].open).toBe(15);
    expect(result!.ranges[1].close).toBe(21);
  });

  it('parses single day "Mo 08:00-20:00"', () => {
    const result = parseOpeningHours('Mo 08:00-20:00');
    expect(result).not.toBeNull();
    expect(result!.ranges).toHaveLength(1);
    expect(result!.ranges[0].days).toEqual([1]);
    expect(result!.ranges[0].open).toBe(8);
    expect(result!.ranges[0].close).toBe(20);
  });

  it('parses times without leading zeros "Mo 6:00-22:00"', () => {
    const result = parseOpeningHours('Mo 6:00-22:00');
    expect(result).not.toBeNull();
    expect(result!.ranges).toHaveLength(1);
    expect(result!.ranges[0].open).toBe(6);
    expect(result!.ranges[0].close).toBe(22);
  });

  it('returns null for invalid input', () => {
    expect(parseOpeningHours('not opening hours at all')).toBeNull();
    expect(parseOpeningHours('random gibberish 123')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseOpeningHours('')).toBeNull();
  });
});

describe('isOpenAt', () => {
  it('returns true when open during listed hours', () => {
    // Wednesday (3) at 10:00, with Mo-Fr 06:00-22:00
    const result = isOpenAt('Mo-Fr 06:00-22:00', 10, 3);
    expect(result).toBe(true);
  });

  it('returns false when closed outside listed hours', () => {
    // Wednesday (3) at 23:00, with Mo-Fr 06:00-22:00
    const result = isOpenAt('Mo-Fr 06:00-22:00', 23, 3);
    expect(result).toBe(false);
  });

  it('returns false when day is not in range', () => {
    // Sunday (0) at 10:00, but only Mo-Fr is defined
    const result = isOpenAt('Mo-Fr 06:00-22:00', 10, 0);
    expect(result).toBe(false);
  });

  it('returns true for 24/7 at any time and day', () => {
    expect(isOpenAt('24/7', 3, 0)).toBe(true);   // Sunday 3am
    expect(isOpenAt('24/7', 15, 3)).toBe(true);  // Wednesday 3pm
    expect(isOpenAt('24/7', 23, 6)).toBe(true);  // Saturday 11pm
  });

  it('returns null for undefined opening hours', () => {
    expect(isOpenAt(undefined, 10, 1)).toBeNull();
  });

  it('returns null for empty string opening hours', () => {
    expect(isOpenAt('', 10, 1)).toBeNull();
  });

  it('checks Sunday hours when defined', () => {
    const schedule = 'Mo-Sa 08:00-20:00; Su 10:00-18:00';
    // Sunday (0) at 12:00 - should be open
    expect(isOpenAt(schedule, 12, 0)).toBe(true);
    // Sunday (0) at 9:00 - should be closed (opens at 10)
    expect(isOpenAt(schedule, 9, 0)).toBe(false);
    // Sunday (0) at 19:00 - should be closed (closes at 18)
    expect(isOpenAt(schedule, 19, 0)).toBe(false);
  });

  it('returns false at exact closing time (close is exclusive)', () => {
    // At exactly 22:00 with close=22, hour >= open && hour < close fails
    expect(isOpenAt('Mo-Fr 06:00-22:00', 22, 1)).toBe(false);
  });

  it('returns true at exact opening time', () => {
    expect(isOpenAt('Mo-Fr 06:00-22:00', 6, 1)).toBe(true);
  });
});

describe('isOpenAt: overrides, off rules and common OSM forms', () => {
  it('treats "Su off" and "Su closed" as closed on Sunday', () => {
    expect(isOpenAt('Mo-Su 06:00-22:00; Su closed', 12, 0)).toBe(false);
    expect(isOpenAt('Mo-Su 06:00-22:00; Su off', 12, 0)).toBe(false);
    // other days are untouched
    expect(isOpenAt('Mo-Su 06:00-22:00; Su off', 12, 1)).toBe(true);
  });

  it('lets a later rule replace an earlier one for the same day', () => {
    const schedule = 'Mo-Su 06:00-22:00; Su 10:00-18:00';
    expect(isOpenAt(schedule, 8, 0)).toBe(false);
    expect(isOpenAt(schedule, 12, 0)).toBe(true);
    expect(isOpenAt(schedule, 8, 6)).toBe(true);
  });

  it('reports a fully closed schedule as closed, not unknown', () => {
    expect(isOpenAt('Mo-Su off', 12, 3)).toBe(false);
  });

  it('treats bare times without a day as every day', () => {
    expect(isOpenAt('08:00-20:00', 12, 1)).toBe(true);
    expect(isOpenAt('08:00-20:00', 12, 0)).toBe(true);
    expect(isOpenAt('08:00-20:00', 21, 1)).toBe(false);
  });

  it('accepts comma-separated rules', () => {
    const schedule = 'Mo-Fr 08:00-18:00, Sa 08:00-14:00';
    expect(isOpenAt(schedule, 17, 3)).toBe(true);
    expect(isOpenAt(schedule, 13, 6)).toBe(true);
    expect(isOpenAt(schedule, 15, 6)).toBe(false);
    expect(isOpenAt(schedule, 12, 0)).toBe(false);
  });

  it('ignores public-holiday rules instead of failing the whole string', () => {
    const schedule = 'Mo-Sa 06:00-22:00; PH 10:00-18:00';
    expect(isOpenAt(schedule, 7, 2)).toBe(true);
    expect(isOpenAt(schedule, 12, 0)).toBe(false);
    expect(isOpenAt('Mo-Sa,PH 06:00-22:00', 7, 2)).toBe(true);
    // a holiday-only string tells us nothing about weekdays
    expect(isOpenAt('PH off', 12, 1)).toBeNull();
  });

  it('handles ranges that wrap past midnight', () => {
    expect(isOpenAt('Mo-Su 18:00-02:00', 23, 1)).toBe(true);
    expect(isOpenAt('Mo-Su 22:00-06:00', 5, 1)).toBe(true);
    expect(isOpenAt('Mo-Su 22:00-06:00', 12, 1)).toBe(false);
    // Friday night spills into Saturday morning, but not into Friday morning
    expect(isOpenAt('Fr 22:00-04:00', 2, 6)).toBe(true);
    expect(isOpenAt('Fr 22:00-04:00', 2, 5)).toBe(false);
  });
});
