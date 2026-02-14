import type { SupplyPoint, SupplyGap, GapSeverity } from '../types';

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
  safe: 30,
  caution: 50,
  minEdgeGap: 5,
  minBetweenGap: 20,
};

const WATER_THRESHOLDS: GapThresholds = {
  safe: 20,
  caution: 40,
  minEdgeGap: 10,
  minBetweenGap: 15,
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
