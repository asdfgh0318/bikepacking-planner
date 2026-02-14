import * as turf from '@turf/turf';
import type { DaySegment, SupplyPoint } from '../types';

/**
 * Split a route into daily segments.
 * Tries to align day-end points with nearby supply stops when possible.
 */
export function splitRouteIntoDays(
  routeGeometry: GeoJSON.LineString,
  dailyTargetKm: number,
  supplyPoints: SupplyPoint[]
): DaySegment[] {
  const line = turf.lineString(routeGeometry.coordinates);
  const totalLength = turf.length(line, { units: 'kilometers' });

  if (totalLength === 0) return [];

  const days: DaySegment[] = [];
  let currentKm = 0;
  let dayNum = 1;

  while (currentKm < totalLength - 1) {
    const targetEnd = Math.min(currentKm + dailyTargetKm, totalLength);

    // Look for a supply point near the target end (within 20% of daily distance)
    const searchRadius = dailyTargetKm * 0.2;
    const minEnd = Math.max(currentKm + dailyTargetKm * 0.6, currentKm + 10);
    const maxEnd = Math.min(currentKm + dailyTargetKm * 1.3, totalLength);

    let bestEnd = targetEnd;

    // Find closest supply point to target end
    const nearbySupply = supplyPoints
      .filter((sp) => sp.distanceFromStartKm >= minEnd && sp.distanceFromStartKm <= maxEnd)
      .sort(
        (a, b) =>
          Math.abs(a.distanceFromStartKm - targetEnd) - Math.abs(b.distanceFromStartKm - targetEnd)
      );

    if (nearbySupply.length > 0 && Math.abs(nearbySupply[0].distanceFromStartKm - targetEnd) < searchRadius) {
      bestEnd = nearbySupply[0].distanceFromStartKm;
    }

    // Don't create tiny last segments — merge into current day
    if (totalLength - bestEnd < dailyTargetKm * 0.3) {
      bestEnd = totalLength;
    }

    // Get start and end coordinates along the route
    const startPoint = turf.along(line, currentKm, { units: 'kilometers' });
    const endPoint = turf.along(line, bestEnd, { units: 'kilometers' });

    // Calculate elevation for this segment
    const { ascent, descent } = getSegmentElevation(routeGeometry, currentKm, bestEnd);

    // Gather supply stops in this segment
    const segmentSupply = supplyPoints.filter(
      (sp) => sp.distanceFromStartKm >= currentKm && sp.distanceFromStartKm <= bestEnd
    );

    days.push({
      dayNumber: dayNum,
      startKm: currentKm,
      endKm: bestEnd,
      distanceKm: bestEnd - currentKm,
      ascentM: ascent,
      descentM: descent,
      startCoord: startPoint.geometry.coordinates as [number, number],
      endCoord: endPoint.geometry.coordinates as [number, number],
      supplyStops: segmentSupply,
    });

    currentKm = bestEnd;
    dayNum++;
  }

  return days;
}

function getSegmentElevation(
  routeGeometry: GeoJSON.LineString,
  startKm: number,
  endKm: number
): { ascent: number; descent: number } {
  const line = turf.lineString(routeGeometry.coordinates);
  const totalLen = turf.length(line, { units: 'kilometers' });

  let ascent = 0;
  let descent = 0;

  // Sample elevation at regular intervals
  const stepKm = 0.5;
  let prevEle: number | null = null;

  for (let km = startKm; km <= endKm; km += stepKm) {
    const pt = turf.along(line, Math.min(km, totalLen), { units: 'kilometers' });
    const coord = pt.geometry.coordinates;
    const ele = coord.length > 2 ? coord[2] : null;

    if (ele != null && prevEle != null) {
      const diff = ele - prevEle;
      if (diff > 0) ascent += diff;
      else descent += Math.abs(diff);
    }
    if (ele != null) prevEle = ele;
  }

  return { ascent, descent };
}
