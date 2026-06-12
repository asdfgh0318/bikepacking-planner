import { describe, it, expect } from 'vitest';
import { addDays, tripDayDate } from './date';

describe('addDays', () => {
  it('advances within a month', () => {
    expect(addDays('2026-04-13', 1)).toBe('2026-04-14');
    expect(addDays('2026-04-13', 7)).toBe('2026-04-20');
  });

  it('rolls into the next month and year', () => {
    expect(addDays('2026-04-30', 1)).toBe('2026-05-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('accepts negative offsets', () => {
    expect(addDays('2026-04-13', -1)).toBe('2026-04-12');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('survives DST spring-forward (Europe/Warsaw 2026-03-29)', () => {
    // The original helpers built `T00:00:00` in local time; on the night
    // clocks jump from 02:00 to 03:00, +1 day could land on the wrong date.
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
  });

  it('handles leap-year Feb 29', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(addDays('2025-02-28', 1)).toBe('2025-03-01');
  });

  it('returns the input unchanged on malformed dates', () => {
    expect(addDays('', 1)).toBe('');
    expect(addDays('not-a-date', 1)).toBe('not-a-date');
    expect(addDays('2026/04/13', 1)).toBe('2026/04/13');
  });
});

describe('tripDayDate', () => {
  it('returns the start date for day 1', () => {
    expect(tripDayDate('2026-04-13', 1)).toBe('2026-04-13');
  });

  it('advances by (dayNumber - 1) days', () => {
    expect(tripDayDate('2026-04-13', 2)).toBe('2026-04-14');
    expect(tripDayDate('2026-04-13', 8)).toBe('2026-04-20');
  });

  it('accepts day 0 / negative day numbers (used for ship-by dates)', () => {
    expect(tripDayDate('2026-04-13', 0)).toBe('2026-04-12');
    expect(tripDayDate('2026-04-13', -2)).toBe('2026-04-10');
  });

  it('returns null when start date is missing or malformed', () => {
    expect(tripDayDate(undefined, 1)).toBe(null);
    expect(tripDayDate('', 1)).toBe(null);
    expect(tripDayDate('not-a-date', 1)).toBe(null);
  });
});
