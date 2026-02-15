import type { SupplyPoint, SupplyGap, GapSeverity, GapAlternative } from '../types';
import {
  FOOD_GAP_SAFE_KM,
  FOOD_GAP_CAUTION_KM,
  FOOD_GAP_MIN_EDGE_KM,
  FOOD_GAP_MIN_BETWEEN_KM,
  WATER_GAP_SAFE_KM,
  WATER_GAP_CAUTION_KM,
  WATER_GAP_MIN_EDGE_KM,
  WATER_GAP_MIN_BETWEEN_KM,
} from '../config';
import { distanceKm } from '../utils/distance';

export const FOOD_TYPES = ['paczkomat', 'zabka', 'biedronka', 'shop'];
const WATER_TYPES = ['water'];

interface GapThresholds {
  safe: number;      // below this km = 'safe'
  caution: number;   // below this km = 'caution', above = 'danger'
  minEdgeGap: number;   // minimum gap from start/end to report
  minBetweenGap: number; // minimum gap between stops to report
}

function getSeverity(distanceKm: number, t: GapThresholds): GapSeverity {
  if (distanceKm < t.safe) return 'safe';
  if (distanceKm < t.caution) return 'caution';
  return 'danger';
}

/**
 * Generic gap analysis: find gaps between filtered supply points along a route.
 */
function analyzeGaps(
  supplyPoints: SupplyPoint[],
  totalDistanceKm: number,
  filter: (sp: SupplyPoint) => boolean,
  thresholds: GapThresholds
): SupplyGap[] {
  if (totalDistanceKm <= 0) return [];

  const stops = supplyPoints
    .filter(filter)
    .sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);

  const gaps: SupplyGap[] = [];

  // No stops at all — single gap spanning the entire route
  if (stops.length === 0) {
    gaps.push({
      startKm: 0,
      endKm: totalDistanceKm,
      distanceKm: totalDistanceKm,
      severity: getSeverity(totalDistanceKm, thresholds),
      fromName: 'Start',
      toName: 'End',
    });
    return gaps;
  }

  // Gap from start to first stop
  if (stops[0].distanceFromStartKm > thresholds.minEdgeGap) {
    const dist = stops[0].distanceFromStartKm;
    gaps.push({
      startKm: 0,
      endKm: dist,
      distanceKm: dist,
      severity: getSeverity(dist, thresholds),
      fromName: 'Start',
      toName: stops[0].name,
    });
  }

  // Gaps between consecutive stops
  for (let i = 1; i < stops.length; i++) {
    const dist = stops[i].distanceFromStartKm - stops[i - 1].distanceFromStartKm;
    if (dist > thresholds.minBetweenGap) {
      gaps.push({
        startKm: stops[i - 1].distanceFromStartKm,
        endKm: stops[i].distanceFromStartKm,
        distanceKm: dist,
        severity: getSeverity(dist, thresholds),
        fromName: stops[i - 1].name,
        toName: stops[i].name,
      });
    }
  }

  // Gap from last stop to end
  const lastStop = stops[stops.length - 1];
  const endGap = totalDistanceKm - lastStop.distanceFromStartKm;
  if (endGap > thresholds.minEdgeGap) {
    gaps.push({
      startKm: lastStop.distanceFromStartKm,
      endKm: totalDistanceKm,
      distanceKm: endGap,
      severity: getSeverity(endGap, thresholds),
      fromName: lastStop.name,
      toName: 'End',
    });
  }

  return gaps.sort((a, b) => b.distanceKm - a.distanceKm);
}

const FOOD_THRESHOLDS: GapThresholds = {
  safe: FOOD_GAP_SAFE_KM,
  caution: FOOD_GAP_CAUTION_KM,
  minEdgeGap: FOOD_GAP_MIN_EDGE_KM,
  minBetweenGap: FOOD_GAP_MIN_BETWEEN_KM,
};

const WATER_THRESHOLDS: GapThresholds = {
  safe: WATER_GAP_SAFE_KM,
  caution: WATER_GAP_CAUTION_KM,
  minEdgeGap: WATER_GAP_MIN_EDGE_KM,
  minBetweenGap: WATER_GAP_MIN_BETWEEN_KM,
};

/**
 * Adjust water thresholds based on max temperature.
 * >30°C: reduce by 30% (safe <14km, danger >28km)
 * >35°C: reduce by 50% (safe <10km, danger >20km)
 */
function getWaterThresholds(maxTempC?: number): GapThresholds {
  if (maxTempC == null) return WATER_THRESHOLDS;
  let factor = 1;
  if (maxTempC > 35) factor = 0.5;
  else if (maxTempC > 30) factor = 0.7;
  if (factor === 1) return WATER_THRESHOLDS;
  return {
    safe: WATER_THRESHOLDS.safe * factor,
    caution: WATER_THRESHOLDS.caution * factor,
    minEdgeGap: WATER_THRESHOLDS.minEdgeGap,
    minBetweenGap: WATER_THRESHOLDS.minBetweenGap,
  };
}

/**
 * Analyze gaps between food supply points along the route.
 * Only considers food-relevant stops (shops, Paczkomaty), not water/campsites/repair.
 */
export function analyzeSupplyGaps(
  supplyPoints: SupplyPoint[],
  totalDistanceKm: number
): SupplyGap[] {
  return analyzeGaps(
    supplyPoints,
    totalDistanceKm,
    (sp) => FOOD_TYPES.includes(sp.type),
    FOOD_THRESHOLDS
  );
}

/**
 * Analyze gaps between water sources along the route.
 * Base thresholds: safe <20km, caution 20-40km, danger >40km.
 * When maxTempC >30°C thresholds are reduced by 30%; >35°C by 50%.
 */
export function analyzeWaterGaps(
  supplyPoints: SupplyPoint[],
  totalDistanceKm: number,
  maxTempC?: number
): SupplyGap[] {
  return analyzeGaps(
    supplyPoints,
    totalDistanceKm,
    (sp) => WATER_TYPES.includes(sp.type),
    getWaterThresholds(maxTempC)
  );
}

/** Maximum distance (km) from gap midpoint to consider an off-route shop. */
const OFF_ROUTE_SEARCH_RADIUS_KM = 10;
/** Maximum number of alternatives to return per gap. */
const MAX_ALTERNATIVES = 3;

/**
 * Find off-route food shops near a supply gap that the rider could detour to.
 *
 * Looks for food-type supply points that are within OFF_ROUTE_SEARCH_RADIUS_KM
 * of the gap midpoint but further than half the corridor width from the route
 * (i.e. they were fetched in the bbox but filtered out by the corridor, or they
 * sit at the gap edges). Returns up to MAX_ALTERNATIVES sorted by detour distance.
 */
export function findGapAlternatives(
  gap: SupplyGap,
  allSupplyPoints: SupplyPoint[],
  corridorWidthKm: number,
): GapAlternative[] {
  const gapMidKm = (gap.startKm + gap.endKm) / 2;

  // We don't have the route geometry coordinate at the midpoint, so we
  // approximate by finding supply points near the gap range and measuring
  // Euclidean distance from the gap midpoint along the route.
  // We use the nearest in-corridor food shop to estimate the midpoint lat/lng.
  // If we can't, we skip alternatives.

  const foodShops = allSupplyPoints.filter(p => FOOD_TYPES.includes(p.type));

  // Find a reference point for the midpoint location.
  // Use the closest food shop to the gap midpoint (before or after) as a proxy
  // for the geographic area of the gap.
  const sortedByProximity = foodShops
    .map(s => ({ shop: s, distFromMid: Math.abs(s.distanceFromStartKm - gapMidKm) }))
    .sort((a, b) => a.distFromMid - b.distFromMid);

  if (sortedByProximity.length === 0) return [];

  // Use two boundary shops to interpolate the midpoint lat/lng
  const shopBefore = foodShops
    .filter(s => s.distanceFromStartKm <= gap.startKm)
    .sort((a, b) => b.distanceFromStartKm - a.distanceFromStartKm)[0];
  const shopAfter = foodShops
    .filter(s => s.distanceFromStartKm >= gap.endKm)
    .sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm)[0];

  // Estimate midpoint lat/lng by interpolation or using whichever boundary exists
  let midLat: number;
  let midLng: number;
  if (shopBefore && shopAfter) {
    const totalSpan = shopAfter.distanceFromStartKm - shopBefore.distanceFromStartKm;
    const ratio = totalSpan > 0
      ? (gapMidKm - shopBefore.distanceFromStartKm) / totalSpan
      : 0.5;
    midLat = shopBefore.lat + (shopAfter.lat - shopBefore.lat) * ratio;
    midLng = shopBefore.lng + (shopAfter.lng - shopBefore.lng) * ratio;
  } else if (shopBefore) {
    midLat = shopBefore.lat;
    midLng = shopBefore.lng;
  } else if (shopAfter) {
    midLat = shopAfter.lat;
    midLng = shopAfter.lng;
  } else {
    // Use any supply point as rough estimate
    const ref = sortedByProximity[0].shop;
    midLat = ref.lat;
    midLng = ref.lng;
  }

  const halfCorridor = corridorWidthKm / 2;
  const alternatives: GapAlternative[] = [];

  for (const shop of foodShops) {
    // Skip shops that are already the gap boundary shops (fromName/toName)
    if (shop.distanceFromStartKm <= gap.startKm || shop.distanceFromStartKm >= gap.endKm) {
      // These are outside the gap range on the route, skip
      continue;
    }

    const shopDistFromMid = distanceKm(midLat, midLng, shop.lat, shop.lng);

    if (shopDistFromMid <= OFF_ROUTE_SEARCH_RADIUS_KM && shopDistFromMid > halfCorridor) {
      const detourKm = shopDistFromMid * 2; // round trip
      alternatives.push({
        name: shop.name,
        type: shop.type,
        lat: shop.lat,
        lng: shop.lng,
        detourKm: parseFloat(detourKm.toFixed(1)),
        routeKm: parseFloat(shop.distanceFromStartKm.toFixed(1)),
      });
    }
  }

  return alternatives
    .sort((a, b) => a.detourKm - b.detourKm)
    .slice(0, MAX_ALTERNATIVES);
}

/**
 * Enrich supply gaps with stock-up suggestions and off-route alternatives.
 *
 * For each non-safe gap:
 *  - stockUpAt: the last food shop BEFORE the gap (rider should stock up here)
 *  - nextResupply: the first food shop AFTER the gap (destination to reach)
 *  - alternatives: off-route food shops near the gap midpoint
 */
export function enrichGapsWithSuggestions(
  gaps: SupplyGap[],
  allSupplyPoints: SupplyPoint[],
  corridorWidthKm: number,
): SupplyGap[] {
  const foodShops = allSupplyPoints
    .filter(p => FOOD_TYPES.includes(p.type))
    .sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);

  return gaps.map(gap => {
    if (gap.severity === 'safe') return gap;

    // Find last food shop before gap start
    const before = foodShops
      .filter(s => s.distanceFromStartKm <= gap.startKm)
      .sort((a, b) => b.distanceFromStartKm - a.distanceFromStartKm)[0];

    // Find first food shop after gap end
    const after = foodShops
      .filter(s => s.distanceFromStartKm >= gap.endKm)
      .sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm)[0];

    const alternatives = findGapAlternatives(gap, allSupplyPoints, corridorWidthKm);

    return {
      ...gap,
      stockUpAt: before
        ? { name: before.name, km: parseFloat(before.distanceFromStartKm.toFixed(1)) }
        : undefined,
      nextResupply: after
        ? { name: after.name, km: parseFloat(after.distanceFromStartKm.toFixed(1)) }
        : undefined,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
    };
  });
}
