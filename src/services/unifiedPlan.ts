import type {
  DietProfile,
  DaySegment,
  SupplyPoint,
  SupplyGap,
  PaczkomatConfig,
  UnifiedShoppingPlan,
  DayShoppingBreakdown,
} from '../types';
import { calculateDailyCalories } from './diet';
import { generateResupplyPlan } from './resupplyPlanner';
import type { ResupplyConfig } from './resupplyPlanner';
import { generateShippingPlan } from './paczkomatStrategy';

/**
 * Generate a unified shopping plan combining smart resupply and Paczkomat pre-shipping.
 */
export function generateUnifiedPlan(
  profile: DietProfile,
  daySegments: DaySegment[],
  supplyPoints: SupplyPoint[],
  supplyGaps: SupplyGap[],
  paczkomatConfig: PaczkomatConfig | null,
  resupplyConfig: ResupplyConfig
): UnifiedShoppingPlan {
  // Step 1: Generate shipping plan (if enabled)
  const shipping = paczkomatConfig
    ? generateShippingPlan(daySegments, supplyPoints, profile, paczkomatConfig)
    : null;

  // Step 2: Generate smart resupply plan. A locker is not a shop: it holds
  // food only if a parcel was shipped there, and those are merged in below.
  const resupply = generateResupplyPlan(
    profile,
    daySegments,
    supplyPoints.filter((p) => p.type !== 'paczkomat'),
    supplyGaps,
    {
      ...resupplyConfig,
      parcelPickups: shipping?.parcels.map((parcel) => ({
        dayNumber: parcel.dayNumber,
        distanceKm: parcel.targetPaczkomat.distanceFromStartKm,
        calories: parcel.totalCalories,
        weightG: parcel.totalWeightG,
      })),
    }
  );

  // Step 3: Merge into parcel pickups as purchases
  if (shipping) {
    for (const parcel of shipping.parcels) {
      const seg = daySegments.find((d) => d.dayNumber === parcel.dayNumber);
      const kmIntoDay = seg
        ? Math.min(seg.endKm, Math.max(seg.startKm, parcel.targetPaczkomat.distanceFromStartKm)) - seg.startKm
        : 0;
      resupply.purchases.push({
        stopId: parcel.targetPaczkomat.id,
        stopName: parcel.targetPaczkomat.name,
        stopType: 'paczkomat',
        distanceKm: parcel.targetPaczkomat.distanceFromStartKm,
        dayNumber: parcel.dayNumber,
        estimatedArrivalHour: resupplyConfig.rideStartHour + kmIntoDay / resupplyConfig.avgSpeedKmh,
        isOpenOnArrival: parcel.targetPaczkomat.details?.is24h ?? null,
        items: parcel.items,
        totalCalories: parcel.totalCalories,
        totalWeightG: parcel.totalWeightG,
        source: 'paczkomat',
      });
    }
    // Re-sort purchases by distance
    resupply.purchases.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  // Step 4: Build per-day breakdown
  const dayBreakdown: DayShoppingBreakdown[] = daySegments.map((seg) => {
    const dayPurchases = resupply.purchases.filter((p) => p.dayNumber === seg.dayNumber);
    const shopPurchases = dayPurchases.filter((p) => p.source === 'shop');
    const parcelPickup = shipping?.parcels.find((p) => p.dayNumber === seg.dayNumber) ?? null;

    const dailyCals = calculateDailyCalories(profile, seg.distanceKm, seg.ascentM);
    const calsFromParcels = parcelPickup?.totalCalories ?? 0;
    const calsFromShops = shopPurchases.reduce((s, p) => s + p.totalCalories, 0);

    // Find carry weight from curve
    const dayWeights = resupply.carryWeightCurve.filter((p) => p.dayNumber === seg.dayNumber);
    const startWeight = dayWeights.length > 0 ? dayWeights[0].foodWeightG : 0;
    const maxWeight = dayWeights.length > 0 ? Math.max(...dayWeights.map((w) => w.foodWeightG)) : 0;

    return {
      dayNumber: seg.dayNumber,
      distanceKm: seg.distanceKm,
      caloriesNeeded: dailyCals,
      caloriesFromParcels: calsFromParcels,
      caloriesFromShops: calsFromShops,
      carryWeightStartG: startWeight,
      carryWeightMaxG: maxWeight,
      stops: dayPurchases,
      parcelPickup,
    };
  });

  return { resupply, shipping, dayBreakdown };
}
