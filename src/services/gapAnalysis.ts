import type { SupplyPoint, SupplyGap, GapSeverity } from '../types';

export const FOOD_TYPES = ['paczkomat', 'zabka', 'biedronka', 'shop'];

function getGapSeverity(distanceKm: number): GapSeverity {
  if (distanceKm < 30) return 'safe';
  if (distanceKm < 50) return 'caution';
  return 'danger';
}

/**
 * Analyze gaps between food supply points along the route.
 * Only considers food-relevant stops (shops, Paczkomaty), not water/campsites/repair.
 */
export function analyzeSupplyGaps(
  supplyPoints: SupplyPoint[],
  totalDistanceKm: number
): SupplyGap[] {
  if (totalDistanceKm <= 0) return [];

  const foodStops = supplyPoints
    .filter((sp) => FOOD_TYPES.includes(sp.type))
    .sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);

  const gaps: SupplyGap[] = [];

  // Gap from start to first food stop
  if (foodStops.length === 0) {
    gaps.push({
      startKm: 0,
      endKm: totalDistanceKm,
      distanceKm: totalDistanceKm,
      severity: getGapSeverity(totalDistanceKm),
      fromName: 'Start',
      toName: 'End',
    });
    return gaps;
  }

  // Gap from start
  if (foodStops[0].distanceFromStartKm > 5) {
    const dist = foodStops[0].distanceFromStartKm;
    gaps.push({
      startKm: 0,
      endKm: dist,
      distanceKm: dist,
      severity: getGapSeverity(dist),
      fromName: 'Start',
      toName: foodStops[0].name,
    });
  }

  // Gaps between food stops
  for (let i = 1; i < foodStops.length; i++) {
    const dist = foodStops[i].distanceFromStartKm - foodStops[i - 1].distanceFromStartKm;
    if (dist > 20) {
      gaps.push({
        startKm: foodStops[i - 1].distanceFromStartKm,
        endKm: foodStops[i].distanceFromStartKm,
        distanceKm: dist,
        severity: getGapSeverity(dist),
        fromName: foodStops[i - 1].name,
        toName: foodStops[i].name,
      });
    }
  }

  // Gap from last food stop to end
  const lastStop = foodStops[foodStops.length - 1];
  const endGap = totalDistanceKm - lastStop.distanceFromStartKm;
  if (endGap > 5) {
    gaps.push({
      startKm: lastStop.distanceFromStartKm,
      endKm: totalDistanceKm,
      distanceKm: endGap,
      severity: getGapSeverity(endGap),
      fromName: lastStop.name,
      toName: 'End',
    });
  }

  return gaps.sort((a, b) => b.distanceKm - a.distanceKm);
}

// Water gap thresholds (tighter than food — dehydration is more urgent)
const WATER_TYPES = ['water'];

function getWaterGapSeverity(distanceKm: number): GapSeverity {
  if (distanceKm < 20) return 'safe';
  if (distanceKm < 40) return 'caution';
  return 'danger';
}

/**
 * Analyze gaps between water sources along the route.
 * Thresholds: safe <20km, caution 20-40km, danger >40km.
 */
export function analyzeWaterGaps(
  supplyPoints: SupplyPoint[],
  totalDistanceKm: number
): SupplyGap[] {
  if (totalDistanceKm <= 0) return [];

  const waterStops = supplyPoints
    .filter((sp) => WATER_TYPES.includes(sp.type))
    .sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);

  const gaps: SupplyGap[] = [];

  if (waterStops.length === 0) {
    gaps.push({
      startKm: 0,
      endKm: totalDistanceKm,
      distanceKm: totalDistanceKm,
      severity: getWaterGapSeverity(totalDistanceKm),
      fromName: 'Start',
      toName: 'End',
    });
    return gaps;
  }

  if (waterStops[0].distanceFromStartKm > 10) {
    const dist = waterStops[0].distanceFromStartKm;
    gaps.push({
      startKm: 0,
      endKm: dist,
      distanceKm: dist,
      severity: getWaterGapSeverity(dist),
      fromName: 'Start',
      toName: waterStops[0].name,
    });
  }

  for (let i = 1; i < waterStops.length; i++) {
    const dist = waterStops[i].distanceFromStartKm - waterStops[i - 1].distanceFromStartKm;
    if (dist > 15) {
      gaps.push({
        startKm: waterStops[i - 1].distanceFromStartKm,
        endKm: waterStops[i].distanceFromStartKm,
        distanceKm: dist,
        severity: getWaterGapSeverity(dist),
        fromName: waterStops[i - 1].name,
        toName: waterStops[i].name,
      });
    }
  }

  const lastStop = waterStops[waterStops.length - 1];
  const endGap = totalDistanceKm - lastStop.distanceFromStartKm;
  if (endGap > 10) {
    gaps.push({
      startKm: lastStop.distanceFromStartKm,
      endKm: totalDistanceKm,
      distanceKm: endGap,
      severity: getWaterGapSeverity(endGap),
      fromName: lastStop.name,
      toName: 'End',
    });
  }

  return gaps.sort((a, b) => b.distanceKm - a.distanceKm);
}
