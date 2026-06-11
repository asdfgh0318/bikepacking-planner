/**
 * Polish Sunday trading exception calendar.
 *
 * Poland bans most retail on Sundays, but ~7 Sundays per year are exempt
 * (trading Sundays). On those days all shops — including large retailers
 * like Biedronka — are open as normal.
 *
 * Per the trading-restriction act (ustawa o ograniczeniu handlu w niedziele,
 * as in force since 2020), the exempt Sundays are:
 *  - the last Sunday of January, April, June and August
 *  - the Sunday directly before Easter (Palm Sunday)
 *  - the two Sundays directly before Christmas Day (Dec 25)
 *
 * Computed algorithmically so the calendar never goes stale. If the law
 * changes, only the rule list below needs updating.
 */

/** Easter Sunday for a given year (anonymous Gregorian computus). */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/** Last Sunday of a given month (1-12). */
function lastSundayOf(year: number, month: number): Date {
  const lastDay = new Date(Date.UTC(year, month, 0)); // day 0 of next month
  lastDay.setUTCDate(lastDay.getUTCDate() - lastDay.getUTCDay());
  return lastDay;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/** All trading Sundays for a year, as YYYY-MM-DD strings. */
export function tradingSundaysFor(year: number): string[] {
  const palmSunday = addDays(easterSunday(year), -7);

  // The two Sundays directly preceding Christmas Day (Dec 25)
  const christmas = new Date(Date.UTC(year, 11, 25));
  const offsetToSunday = christmas.getUTCDay() === 0 ? 7 : christmas.getUTCDay();
  const sundayBeforeChristmas = addDays(christmas, -offsetToSunday);

  const dates = [
    lastSundayOf(year, 1),
    palmSunday,
    lastSundayOf(year, 4),
    lastSundayOf(year, 6),
    lastSundayOf(year, 8),
    addDays(sundayBeforeChristmas, -7),
    sundayBeforeChristmas,
  ];
  // Palm Sunday can coincide with the last Sunday of March/April edge cases;
  // dedupe and keep chronological order.
  return [...new Set(dates.map(toDateStr))].sort();
}

const cache = new Map<number, ReadonlySet<string>>();

/**
 * Check whether a given date (YYYY-MM-DD) falls on a Polish trading Sunday.
 */
export function isTradingSunday(dateStr: string): boolean {
  const year = Number(dateStr.slice(0, 4));
  if (!Number.isInteger(year)) return false;
  let set = cache.get(year);
  if (!set) {
    set = new Set(tradingSundaysFor(year));
    cache.set(year, set);
  }
  return set.has(dateStr);
}

/**
 * Returns a short label for UI display.
 */
export function getTradingSundayLabel(): string {
  return 'Trading Sunday';
}
