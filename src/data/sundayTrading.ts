/**
 * Polish Sunday trading exception calendar.
 *
 * Poland bans most retail on Sundays, but ~7 Sundays per year are exempt
 * (trading Sundays). On those days all shops — including large retailers
 * like Biedronka — are open as normal.
 */

const TRADING_SUNDAYS: ReadonlySet<string> = new Set([
  // 2025
  '2025-01-26',
  '2025-04-13', // Palm Sunday
  '2025-04-27', // last Sunday of April
  '2025-06-29', // last Sunday of June
  '2025-08-31', // last Sunday of August
  '2025-12-14', // two Sundays before Christmas
  '2025-12-21', // Sunday before Christmas

  // 2026
  '2026-01-25',
  '2026-03-29', // Palm Sunday (Easter April 5)
  '2026-04-26', // last Sunday of April
  '2026-06-28', // last Sunday of June
  '2026-08-30', // last Sunday of August
  '2026-12-13', // two Sundays before Christmas
  '2026-12-20', // Sunday before Christmas
]);

/**
 * Check whether a given date (YYYY-MM-DD) falls on a Polish trading Sunday.
 */
export function isTradingSunday(dateStr: string): boolean {
  return TRADING_SUNDAYS.has(dateStr);
}

/**
 * Returns a short label for UI display.
 */
export function getTradingSundayLabel(): string {
  return 'Trading Sunday';
}
