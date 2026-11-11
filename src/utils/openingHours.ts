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

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
/** Public/school holiday selectors: we have no holiday calendar, so they are ignored. */
const HOLIDAY_TOKEN = /^(PH|SH)$/;
// "Mo-Fr 08:00-18:00, Sa 08:00-14:00": a comma after a time (or off/closed)
// and before a letter starts a new rule; "Mo,We 08:00-16:00" and
// "09:00-13:00,15:00-21:00" are left alone.
const COMMA_RULE_SEPARATOR = /(?<=\d|off|closed|open)\s*,\s*(?=[A-Za-z])/i;

export function parseOpeningHours(raw: string): ParsedSchedule | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (is24_7String(trimmed)) return { is24_7: true, ranges: [] };

  let ranges: TimeRange[] = [];
  let sawRule = false;

  // Split by semicolons: "Mo-Fr 06:00-22:00; Sa 07:00-21:00"
  const parts = trimmed.split(';').map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    const subRules = part.split(COMMA_RULE_SEPARATOR).map((s) => s.trim()).filter(Boolean);

    for (let i = 0; i < subRules.length; i++) {
      // "Mo-Fr 06:00-22:00", "Sa 07:00-21:00", "Mo,We,Fr 08:00-16:00",
      // "Mo-Fr 09:00-13:00,15:00-21:00", "Su off", or a bare "08:00-20:00".
      const match = subRules[i].match(/^(?:([A-Za-z,-]+)\s+)?(open|closed|off|[\d:,\s-]+)$/i);
      if (!match) return null;

      const [, daySpec, body] = match;
      let days: number[];
      if (daySpec === undefined) {
        days = ALL_DAYS; // no day given means every day
      } else {
        const dayParts = daySpec.split(',').map((d) => d.trim());
        const weekdayParts = dayParts.filter((d) => !HOLIDAY_TOKEN.test(d));
        // A holiday-only rule ("PH off", "PH 10:00-18:00") says nothing about weekdays.
        if (weekdayParts.length === 0) continue;
        days = [];
        for (const dp of weekdayParts) {
          const expanded = expandDayRange(dp);
          if (expanded.length === 0) return null;
          days.push(...expanded);
        }
      }

      const keyword = body.toLowerCase();
      // Keyword-only "Mo open" carries no hours; skipped as before.
      if (keyword === 'open') continue;

      const isOff = keyword === 'off' || keyword === 'closed';
      const timeRanges = isOff ? [] : parseTimeRanges(body);
      if (!isOff && timeRanges.length === 0) return null;

      // OSM semantics: a later rule replaces earlier ones for the days it
      // names. Comma-joined rules after the first are additive.
      if (i === 0 || isOff) {
        ranges = ranges
          .map((r) => ({ ...r, days: r.days.filter((d) => !days.includes(d)) }))
          .filter((r) => r.days.length > 0);
      }
      for (const tr of timeRanges) {
        ranges.push({ days: [...days], open: tr.open, close: tr.close });
      }
      sawRule = true;
    }
  }

  return sawRule ? { is24_7: false, ranges } : null;
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

  const previousDay = (dayOfWeek + 6) % 7;
  for (const range of schedule.ranges) {
    // "18:00-02:00" (or "18:00-26:00") wraps past midnight into the next day.
    const close = range.close > 24 ? range.close - 24 : range.close;
    const wraps = close <= range.open;
    if (range.days.includes(dayOfWeek)) {
      if (wraps ? hour >= range.open : hour >= range.open && hour < close) return true;
    }
    if (wraps && range.days.includes(previousDay) && hour < close) return true;
  }
  return false;
}
