const DAY_MAP: Record<string, number> = {
  Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6, Su: 0,
};
const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

interface TimeRange {
  days: number[]; // 0=Su, 1=Mo..6=Sa
  open: number;   // hour decimal (e.g. 6.5 = 06:30)
  close: number;
}

export interface ParsedSchedule {
  is24_7: boolean;
  ranges: TimeRange[];
}

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h + (m || 0) / 60;
}

function expandDayRange(range: string): number[] {
  const parts = range.split('-');
  if (parts.length === 1) {
    const d = DAY_MAP[parts[0]];
    return d !== undefined ? [d] : [];
  }
  const startIdx = DAY_NAMES.indexOf(parts[0]);
  const endIdx = DAY_NAMES.indexOf(parts[1]);
  if (startIdx < 0 || endIdx < 0) return [];

  const days: number[] = [];
  for (let i = startIdx; i !== (endIdx + 1) % 7 || days.length === 0; i = (i + 1) % 7) {
    days.push(DAY_MAP[DAY_NAMES[i]]);
    if (days.length > 7) break;
  }
  return days;
}

export function parseOpeningHours(raw: string): ParsedSchedule | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (trimmed === '24/7') return { is24_7: true, ranges: [] };

  const ranges: TimeRange[] = [];

  // Split by semicolons: "Mo-Fr 06:00-22:00; Sa 07:00-21:00"
  const parts = trimmed.split(';').map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    // Match "Mo-Fr 06:00-22:00" or "Sa 07:00-21:00" or "Mo,We,Fr 08:00-16:00"
    const match = part.match(/^([A-Za-z,\-]+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
    if (!match) return null;

    const [, daySpec, openStr, closeStr] = match;
    const dayParts = daySpec.split(',');
    const days: number[] = [];
    for (const dp of dayParts) {
      days.push(...expandDayRange(dp.trim()));
    }
    if (days.length === 0) return null;

    ranges.push({
      days,
      open: parseTime(openStr),
      close: parseTime(closeStr),
    });
  }

  return ranges.length > 0 ? { is24_7: false, ranges } : null;
}

/**
 * Check if a store is open at a given hour and day of week.
 * Returns null if we couldn't parse the opening hours.
 */
export function isOpenAt(
  openingHours: string | undefined,
  hour: number,
  dayOfWeek: number // 0=Sunday, 1=Monday..6=Saturday
): boolean | null {
  if (!openingHours) return null;

  const schedule = parseOpeningHours(openingHours);
  if (!schedule) return null;
  if (schedule.is24_7) return true;

  for (const range of schedule.ranges) {
    if (range.days.includes(dayOfWeek)) {
      if (hour >= range.open && hour < range.close) return true;
    }
  }
  return false;
}
