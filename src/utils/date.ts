/**
 * Helpers for ISO calendar dates (YYYY-MM-DD).
 *
 * A trip date like "2026-04-13" represents a calendar day, not a moment in
 * time — there is no correct timezone for it. All arithmetic here runs in
 * UTC so the result is the same regardless of where the user is sitting
 * or whether DST shifts in their locale during the trip.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Add a (possibly negative) number of days to an ISO date string.
 * Returns the input unchanged if it isn't a valid YYYY-MM-DD string.
 */
export function addDays(isoDate: string, days: number): string {
  if (!ISO_DATE.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(date.getTime())) return isoDate;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * ISO date for a 1-indexed trip day number. Day 1 is the start date.
 * Returns null when there's no start date or it isn't a valid YYYY-MM-DD.
 */
export function tripDayDate(
  tripStartDate: string | undefined,
  dayNumber: number,
): string | null {
  if (!tripStartDate || !ISO_DATE.test(tripStartDate)) return null;
  return addDays(tripStartDate, dayNumber - 1);
}
