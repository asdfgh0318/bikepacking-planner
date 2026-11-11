/** Hours and minutes of a decimal hour count, rounded to the minute as a whole (never ":60"). */
function splitHours(h: number): [number, string] {
  const total = Math.round(h * 60);
  return [Math.floor(total / 60), String(total % 60).padStart(2, '0')];
}

/** A duration: 5.5 -> "5h30". */
export function formatHours(h: number): string {
  const [hh, mm] = splitHours(h);
  return `${hh}h${mm}`;
}

/** A time of day: 7.5 -> "7:30". */
export function formatClock(h: number): string {
  const [hh, mm] = splitHours(h);
  return `${hh}:${mm}`;
}
