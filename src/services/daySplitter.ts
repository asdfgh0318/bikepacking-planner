import { lineString, length, along, point, distance } from '@turf/turf';
import type { DaySegment, Difficulty, NightStop, SupplyPoint, RoutingProfile } from '../types';

// Base speeds by routing profile (km/h, loaded bikepacking)
// Source: bikepacking.com pace data, surface type research
const PROFILE_SPEEDS: Record<RoutingProfile, number> = {
  fastbike: 18,    // paved roads
  trekking: 14,    // mixed surfaces (gravel + road)
  mtb: 9,          // singletrack-heavy routes
};

/**
 * Estimate ride time in hours for a bikepacking day.
 * Based on Naismith's rule adapted for loaded touring bikes:
 * - Base speed varies by routing profile (9-18 km/h)
 * - Add 1 hour per 400m ascent (steep terrain penalty)
 * - Add 15 min break per 2 hours riding
 */
function estimateRideHours(distanceKm: number, ascentM: number, profile: RoutingProfile = 'trekking'): number {
  const baseSpeed = PROFILE_SPEEDS[profile] || 14;
  const flatHours = distanceKm / baseSpeed;
  const climbHours = ascentM / 400;
  const ridingHours = flatHours + climbHours;
  const breakHours = Math.floor(ridingHours / 2) * 0.25;
  return ridingHours + breakHours;
}

function getDifficulty(hours: number, ascentM: number): Difficulty {
  if (hours <= 4.5 && ascentM < 600) return 'easy';
  if (hours <= 7 && ascentM < 1200) return 'moderate';
  return 'hard';
}

/**
 * Find the best night stop near the end of a day segment.
 * Prefers campsites within 10km of the day end point.
 * Falls back to 'wild' camping at the day end coordinate.
 */
function findNightStop(
  dayNumber: number,
  endKm: number,
  endCoord: [number, number],
  supplyPoints: SupplyPoint[],
  totalLength: number
): NightStop {
  // Don't suggest night stop for the final day (you're done!)
  if (endKm >= totalLength - 0.5) {
    return {
      dayNumber,
      campsite: null,
      distanceFromStartKm: endKm,
      coord: endCoord,
      type: 'wild',
    };
  }

  // Search for campsites within 10km of the day end
  const searchRadius = 10;
  const nearbyCampsites = supplyPoints
    .filter(
      (sp) =>
        sp.type === 'campsite' &&
        sp.distanceFromStartKm >= endKm - searchRadius &&
        sp.distanceFromStartKm <= endKm + searchRadius
    )
    .sort(
      (a, b) =>
        Math.abs(a.distanceFromStartKm - endKm) - Math.abs(b.distanceFromStartKm - endKm)
    );

  if (nearbyCampsites.length > 0) {
    const best = nearbyCampsites[0];
    return {
      dayNumber,
      campsite: best,
      distanceFromStartKm: best.distanceFromStartKm,
      coord: [best.lng, best.lat],
      type: 'campsite',
    };
  }

  return {
    dayNumber,
    campsite: null,
    distanceFromStartKm: endKm,
    coord: endCoord,
    type: 'wild',
  };
}

/**
 * Split a route into daily segments.
 * Tries to align day-end points with nearby supply stops when possible.
 */
export function splitRouteIntoDays(
  routeGeometry: GeoJSON.LineString,
  dailyTargetKm: number,
  supplyPoints: SupplyPoint[],
  routingProfile: RoutingProfile = 'trekking'
): DaySegment[] {
  const line = lineString(routeGeometry.coordinates);
  const totalLength = length(line, { units: 'kilometers' });

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
    const startPoint = along(line, currentKm, { units: 'kilometers' });
    const endPoint = along(line, bestEnd, { units: 'kilometers' });

    // Calculate elevation for this segment
    const { ascent, descent } = getSegmentElevation(routeGeometry, currentKm, bestEnd);

    // Gather supply stops in this segment
    const segmentSupply = supplyPoints.filter(
      (sp) => sp.distanceFromStartKm >= currentKm && sp.distanceFromStartKm <= bestEnd
    );

    const segDist = bestEnd - currentKm;
    const hours = estimateRideHours(segDist, ascent, routingProfile);

    const endCoord = endPoint.geometry.coordinates as [number, number];
    const nightStop = findNightStop(dayNum, bestEnd, endCoord, supplyPoints, totalLength);

    days.push({
      dayNumber: dayNum,
      startKm: currentKm,
      endKm: bestEnd,
      distanceKm: segDist,
      ascentM: ascent,
      descentM: descent,
      startCoord: startPoint.geometry.coordinates as [number, number],
      endCoord,
      supplyStops: segmentSupply,
      estimatedHours: hours,
      difficulty: getDifficulty(hours, ascent),
      nightStop,
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
  const coords = routeGeometry.coordinates;

  let ascent = 0;
  let descent = 0;

  // Walk through actual route vertices, accumulating distance to find
  // which coordinates fall within the [startKm, endKm] range.
  // BRouter provides 3D coords [lng, lat, elevation] at every vertex,
  // so using them directly captures all elevation changes instead of
  // sampling at fixed intervals which misses 10-30% of actual ascent.
  let cumulativeKm = 0;
  let prevEle: number | null = null;

  for (let i = 0; i < coords.length; i++) {
    if (i > 0) {
      const from = point(coords[i - 1]);
      const to = point(coords[i]);
      cumulativeKm += distance(from, to, { units: 'kilometers' });
    }

    // Skip coordinates before the segment start
    if (cumulativeKm < startKm) {
      // Still track elevation so the first in-range point can compute a diff
      if (coords[i].length > 2) prevEle = coords[i][2];
      continue;
    }

    // Stop once we pass the segment end
    if (cumulativeKm > endKm) break;

    const ele = coords[i].length > 2 ? coords[i][2] : null;

    if (ele != null && prevEle != null) {
      const diff = ele - prevEle;
      if (diff > 0) ascent += diff;
      else descent += Math.abs(diff);
    }
    if (ele != null) prevEle = ele;
  }

  return { ascent, descent };
}
