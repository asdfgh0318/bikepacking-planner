import { describe, it, expect } from 'vitest';
import { formatHours, formatClock } from './format';

describe('formatHours / formatClock', () => {
  it('formats whole and fractional hours', () => {
    expect(formatHours(5)).toBe('5h00');
    expect(formatHours(5.5)).toBe('5h30');
    expect(formatClock(7.25)).toBe('7:15');
    expect(formatClock(14.05)).toBe('14:03');
  });

  it('carries into the hour instead of printing 60 minutes', () => {
    expect(formatHours(5.995)).toBe('6h00');
    expect(formatClock(7.996)).toBe('8:00');
  });
});
