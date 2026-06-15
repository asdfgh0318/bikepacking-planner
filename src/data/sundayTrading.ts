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

/** All trading Sundays for a year, as YYYY-MM-DD strings, in chronological order. */
export function tradingSundaysFor(year: number): string[] {
  const palmSunday = addDays(easterSunday(year), -7);

  // The two Sundays directly preceding Christmas Day (Dec 25)
  const christmas = new Date(Date.UTC(year, 11, 25));
  const offsetToSunday = christmas.getUTCDay() === 0 ? 7 : christmas.getUTCDay();
  const sundayBeforeChristmas = addDays(christmas, -offsetToSunday);

  // Palm Sunday falls Mar 15 – Apr 18 (Easter is Mar 22 – Apr 25); it never
  // collides with the other rules' ranges (last Sunday of Jan/Apr/Jun/Aug,
  // two Sundays before Dec 25), so the list below is already unique and
  // chronological — no dedupe/sort needed.
  return [
    lastSundayOf(year, 1),
    palmSunday,
    lastSundayOf(year, 4),
    lastSundayOf(year, 6),
    lastSundayOf(year, 8),
    addDays(sundayBeforeChristmas, -7),
    sundayBeforeChristmas,
  ].map(toDateStr);
}

const cache = new Map<number, ReadonlySet<string>>();

import type { SupplyPoint } from '../types';

/**
 * SupplyPoint.type values that are always forced shut on a non-trading
 * Sunday by the Polish trading-restriction act. Used as a fallback for
 * stops without a per-store `closedOnNonTradingSunday` flag (typically
 * older OSM entries that lack `brand:wikidata`).
 *
 * Most chains are now flagged at classification time (poiClassifier.ts
 * BRAND_REGISTRY) — prefer extending that registry over adding new
 * entries here.
 */
const SUNDAY_CLOSED_TYPES: readonly string[] = ['biedronka'];

/**
 * Whether the trading-restriction act forces this stop shut on a
 * non-trading Sunday. Combines the per-store flag set at classification
 * time (covers Lidl/Aldi/Kaufland/Auchan/Carrefour/Dino/Netto/
 * Intermarché — all corporate-operated large-format chains) with the
 * type-based fallback for stops missing brand metadata.
 *
 * Franchise-operated chains (Żabka, Lewiatan) are exempt — see
 * SUNDAY_REDUCED_HOURS_TYPES for the chains that stay open with
 * reduced hours.
 */
export function isClosedOnNonTradingSunday(stop: SupplyPoint): boolean {
  if (stop.details?.closedOnNonTradingSunday) return true;
  return SUNDAY_CLOSED_TYPES.includes(stop.type);
}

/**
 * Retail chains that operate on non-trading Sundays but with reduced
 * hours, typically because they're franchise-operated (the owner is
 * exempt from the trading ban). Żabka franchises usually run ~10:00–18:00
 * instead of their full weekday hours.
 */
export const SUNDAY_REDUCED_HOURS_TYPES: readonly string[] = ['zabka'];

/**
 * Check whether a given date (YYYY-MM-DD) falls on a Polish trading Sunday.
 */
export function isTradingSunday(dateStr: string): boolean {
  const year = Number(dateStr.slice(0, 4));
  // Rejects NaN and degenerate years (Number('') === 0 would slip past an integer check)
  if (!(year >= 1000 && year <= 9999)) return false;
  let set = cache.get(year);
  if (!set) {
    set = new Set(tradingSundaysFor(year));
    cache.set(year, set);
  }
  return set.has(dateStr);
}
