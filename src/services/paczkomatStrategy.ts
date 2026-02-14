import type {
  DietProfile,
  DaySegment,
  SupplyPoint,
  FoodItem,
  PaczkomatParcel,
  PaczkomatConfig,
  ShippingPlan,
} from '../types';
import { FOOD_DB } from './diet';

function getShelfStableItems(foods: FoodItem[]): FoodItem[] {
  return foods.filter((f) => f.availableAt.includes('paczkomat'));
}

function estimateLockerSize(totalWeightG: number): 'A' | 'B' | 'C' {
  if (totalWeightG < 500) return 'A';
  if (totalWeightG < 2000) return 'B';
  return 'C';
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Score a Paczkomat for pre-shipping suitability.
 * Higher score = better choice.
 */
function scorePaczkomat(
  paczkomat: SupplyPoint,
  daySegment: DaySegment,
  config: PaczkomatConfig
): number {
  let score = 0;

  // Prefer 24/7 access
  if (config.prefer24h && paczkomat.details?.is24h) {
    score += 10;
  }

  // Prefer near night stop (end of day) — within 10km of segment end
  if (config.preferNearNightStop) {
    const distFromEnd = Math.abs(paczkomat.distanceFromStartKm - daySegment.endKm);
    if (distFromEnd < 5) score += 8;
    else if (distFromEnd < 10) score += 5;
  }

  // Prefer Paczkomaty with larger lockers
  if (paczkomat.details?.lockerSize?.some((s) => s === 'C' || s === 'L')) {
    score += 3;
  }

  return score;
}

/**
 * Generate a pre-shipping plan for Paczkomaty along the route.
 * Selects strategic Paczkomaty every N days and builds packing lists
 * of shelf-stable items for each.
 */
export function generateShippingPlan(
  daySegments: DaySegment[],
  supplyPoints: SupplyPoint[],
  profile: DietProfile,
  config: PaczkomatConfig
): ShippingPlan {
  if (daySegments.length === 0) {
    return { parcels: [], totalParcels: 0, totalShippingWeightG: 0 };
  }

  const foods = FOOD_DB[profile.type] || FOOD_DB.standard;
  const shelfStableItems = getShelfStableItems(foods);

  if (shelfStableItems.length === 0) {
    return { parcels: [], totalParcels: 0, totalShippingWeightG: 0 };
  }

  const paczkomaty = supplyPoints.filter((sp) => sp.type === 'paczkomat');
  if (paczkomaty.length === 0) {
    return { parcels: [], totalParcels: 0, totalShippingWeightG: 0 };
  }

  const parcels: PaczkomatParcel[] = [];
  let nextParcelDay = config.intervalDays; // First parcel on day N

  while (nextParcelDay <= daySegments.length) {
    // Find the day segment for this parcel
    const targetSeg = daySegments.find((s) => s.dayNumber === nextParcelDay);
    if (!targetSeg) {
      nextParcelDay += config.intervalDays;
      continue;
    }

    // Find Paczkomaty accessible on this day (within this segment or the day before)
    const searchStartKm = targetSeg.startKm - 10;
    const searchEndKm = targetSeg.endKm + 5;

    const candidates = paczkomaty
      .filter((p) =>
        p.distanceFromStartKm >= searchStartKm &&
        p.distanceFromStartKm <= searchEndKm
      )
      .map((p) => ({ point: p, score: scorePaczkomat(p, targetSeg, config) }))
      .sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      const best = candidates[0].point;

      // Build packing list — enough shelf-stable food to supplement 1-2 days
      const targetCals = 800; // Supplemental calories per parcel (not full meals)
      const items: FoodItem[] = [];
      let totalCals = 0;

      // Sort by calorie density for efficient packing
      const sorted = [...shelfStableItems].sort(
        (a, b) => (b.calories / b.weightG) - (a.calories / a.weightG)
      );

      for (const item of sorted) {
        if (totalCals >= targetCals) break;
        items.push(item);
        totalCals += item.calories;
      }

      const totalWeight = items.reduce((s, f) => s + f.weightG, 0);

      const pickupDate = addDays(config.tripStartDate, nextParcelDay - 1);
      const shipByDate = addDays(config.tripStartDate, nextParcelDay - 1 - config.leadTimeDays);

      parcels.push({
        id: `parcel-${parcels.length + 1}`,
        targetPaczkomat: best,
        dayNumber: nextParcelDay,
        estimatedPickupDate: pickupDate,
        shipByDate,
        items,
        totalWeightG: totalWeight,
        totalCalories: totalCals,
        lockerSize: estimateLockerSize(totalWeight),
      });
    }

    nextParcelDay += config.intervalDays;
  }

  return {
    parcels,
    totalParcels: parcels.length,
    totalShippingWeightG: parcels.reduce((s, p) => s + p.totalWeightG, 0),
  };
}
