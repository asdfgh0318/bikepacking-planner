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

function parseTimeRanges(timeSpec: string): Array<{ open: number; close: number }> {
  // Handle comma-separated time ranges: "09:00-13:00,15:00-21:00"
  const segments = timeSpec.split(',').map((s) => s.trim()).filter(Boolean);
  const result: Array<{ open: number; close: number }> = [];
  for (const seg of segments) {
    const m = seg.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
    if (!m) return [];
    result.push({ open: parseTime(m[1]), close: parseTime(m[2]) });
  }
  return result;
}

function is24_7String(s: string): boolean {
  const norm = s.toUpperCase().replace(/\s+/g, ' ').trim();
  // "24/7", "24h", "24H", "OPEN 24H", "OPEN 24/7", "24 HOURS" etc.
  return /^(OPEN\s+)?(24\s*\/\s*7|24\s*H(OURS?)?)$/i.test(norm);
}

export function parseOpeningHours(raw: string): ParsedSchedule | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (is24_7String(trimmed)) return { is24_7: true, ranges: [] };

  const ranges: TimeRange[] = [];

  // Split by semicolons: "Mo-Fr 06:00-22:00; Sa 07:00-21:00"
  const parts = trimmed.split(';').map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    // Skip keyword-only entries like "Tu closed", "Mo open", "PH off"
    if (/^[A-Za-z,\-]+\s+(open|closed|off)$/i.test(part)) continue;

    // Match "Mo-Fr 06:00-22:00" or "Sa 07:00-21:00" or "Mo,We,Fr 08:00-16:00"
    // Also handles comma-separated time ranges: "Mo-Fr 09:00-13:00,15:00-21:00"
    const match = part.match(
      /^([A-Za-z,\-]+)\s+([\d:,\-\s]+)$/
    );
    if (!match) return null;

    const [, daySpec, timeSpec] = match;
    const dayParts = daySpec.split(',');
    const days: number[] = [];
    for (const dp of dayParts) {
      days.push(...expandDayRange(dp.trim()));
    }
    if (days.length === 0) return null;

    const timeRanges = parseTimeRanges(timeSpec);
    if (timeRanges.length === 0) return null;

    for (const tr of timeRanges) {
      ranges.push({ days, open: tr.open, close: tr.close });
    }
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
