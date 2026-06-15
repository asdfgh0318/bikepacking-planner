import type {
  DietProfile,
  DaySegment,
  SupplyPoint,
  SupplyGap,
  FoodItem,
  StopPurchase,
  CarryWeightPoint,
  ResupplyPlan,
  ResupplyWarning,
  ResupplyStrategy,
  ResupplyStrategyId,
  TripContext,
} from '../types';
import { FOOD_DB, calculateDailyCalories } from './diet';
import { FOOD_TYPES } from './gapAnalysis';
import { isOpenAt } from '../utils/openingHours';
import { tripDayDate } from '../utils/date';
import {
  isTradingSunday,
  SUNDAY_CLOSED_TYPES,
  SUNDAY_REDUCED_HOURS_TYPES,
} from '../data/sundayTrading';
import {
  SUNDAY_FOOD_BUFFER,
  DANGER_GAP_LOOKAHEAD_KM,
  DANGER_GAP_EXTRA_CALORIE_FACTOR,
  HEAVY_LOAD_WARNING_G,
} from '../config';

/**
 * Auto-detect the best resupply strategy based on shop density along the route.
 * Filters supply points to food-relevant types and computes shops-per-km density.
 */
export function autoDetectStrategy(
  supplyPoints: SupplyPoint[],
  totalDistanceKm: number,
): { strategyId: ResupplyStrategyId; reason: string } {
  const foodShops = supplyPoints.filter(p =>
    ['zabka', 'biedronka', 'shop', 'paczkomat'].includes(p.type)
  );
  const density = totalDistanceKm > 0 ? foodShops.length / totalDistanceKm : 0;

  if (density > 0.5) return { strategyId: 'grazer', reason: `${foodShops.length} shops (very dense)` };
  if (density > 0.2) return { strategyId: 'daily-ration', reason: `${foodShops.length} shops (normal density)` };
  if (density > 0.05) return { strategyId: 'self-sufficient', reason: `${foodShops.length} shops (sparse)` };
  return { strategyId: 'self-sufficient', reason: `${foodShops.length} shops (very sparse)` };
}

export const RESUPPLY_PRESETS: Record<ResupplyStrategyId, ResupplyStrategy> = {
  auto: {
    id: 'auto',
    label: 'Auto',
    description: 'Automatically picks the best strategy based on shop density along your route',
    maxStopsPerDay: 1,
    preferEarlyStop: true,
    carryBufferDays: 0,
    minCalorieReserve: 0,
    preferStoreType: ['biedronka', 'zabka', 'shop', 'paczkomat'],
  },
  'daily-ration': {
    id: 'daily-ration',
    label: 'Daily Ration',
    description: 'One stop per day, pick up a full ration early and carry it',
    maxStopsPerDay: 1,
    preferEarlyStop: true,
    carryBufferDays: 0,
    minCalorieReserve: 0,
    preferStoreType: ['biedronka', 'zabka', 'shop', 'paczkomat'],
  },
  grazer: {
    id: 'grazer',
    label: 'Frequent Grazer',
    description: 'Stop often, buy small amounts, minimize carry weight',
    maxStopsPerDay: 3,
    preferEarlyStop: false,
    carryBufferDays: 0,
    minCalorieReserve: 500,
    preferStoreType: ['zabka', 'biedronka', 'shop', 'paczkomat'],
  },
  ultralight: {
    id: 'ultralight',
    label: 'Ultralight',
    description: 'Carry absolute minimum, stop at every opportunity',
    maxStopsPerDay: 4,
    preferEarlyStop: false,
    carryBufferDays: 0,
    minCalorieReserve: 300,
    preferStoreType: ['zabka', 'shop', 'biedronka', 'paczkomat'],
  },
  'self-sufficient': {
    id: 'self-sufficient',
    label: 'Self-Sufficient',
    description: 'Stock up heavily, fewer stops, carry 2 days of food',
    maxStopsPerDay: 1,
    preferEarlyStop: true,
    carryBufferDays: 1,
    preferStoreType: ['biedronka', 'shop', 'zabka', 'paczkomat'],
    minCalorieReserve: 0,
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    description: 'Your own settings',
    maxStopsPerDay: 1,
    preferEarlyStop: true,
    carryBufferDays: 0,
    minCalorieReserve: 0,
    preferStoreType: ['biedronka', 'zabka', 'shop', 'paczkomat'],
  },
};

export interface ResupplyConfig {
  rideStartHour: number;
  avgSpeedKmh: number;
  strategy: ResupplyStrategy;
  tripStartDate?: string; // ISO date e.g. '2026-07-01'
  tripContext?: TripContext;
}

function estimateArrivalHour(
  segStartKm: number,
  stopKm: number,
  segStartHour: number,
  avgSpeedKmh: number
): number {
  const hours = (stopKm - segStartKm) / avgSpeedKmh;
  return segStartHour + hours;
}

/**
 * Get day of week (0=Sunday..6=Saturday) for a given day number on the trip.
 * Day 1 is the trip start date.
 */
function getDayOfWeek(tripStartDate: string | undefined, dayNumber: number): number {
  if (!tripStartDate) return 1; // default to Monday if no date set
  const start = new Date(tripStartDate + 'T00:00:00');
  if (isNaN(start.getTime())) return 1;
  start.setDate(start.getDate() + dayNumber - 1);
  return start.getDay(); // 0=Sunday
}

/**
 * Select food items for a stop, prioritizing items available at this store type.
 * Uses calorie/weight ratio for efficiency.
 */
function selectFoodForStop(
  foods: FoodItem[],
  stopType: string,
  caloriesNeeded: number
): FoodItem[] {
  // Prefer items available at this stop type, then by cal/weight ratio
  const sorted = [...foods].sort((a, b) => {
    const aAvail = a.availableAt.includes(stopType as FoodItem['availableAt'][number]) ? 0 : 1;
    const bAvail = b.availableAt.includes(stopType as FoodItem['availableAt'][number]) ? 0 : 1;
    if (aAvail !== bAvail) return aAvail - bAvail;
    return (b.calories / b.weightG) - (a.calories / a.weightG);
  });

  const selected: FoodItem[] = [];
  let totalCals = 0;

  for (const food of sorted) {
    if (totalCals >= caloriesNeeded) break;
    // Only pick items available at this store type
    if (!food.availableAt.includes(stopType as FoodItem['availableAt'][number])) continue;
    selected.push(food);
    totalCals += food.calories;
  }

  // If still short, allow items from any store as fallback
  if (totalCals < caloriesNeeded * 0.7) {
    for (const food of sorted) {
      if (totalCals >= caloriesNeeded) break;
      if (selected.includes(food)) continue;
      selected.push(food);
      totalCals += food.calories;
    }
  }

  return selected;
}

/**
 * Score and rank food stops for a day segment based on strategy.
 * Sunday-aware: skips large retailers closed on Polish Sundays, penalizes reduced-hours stores.
 */
function rankStops(
  stops: SupplyPoint[],
  seg: DaySegment,
  config: ResupplyConfig,
  dayOfWeek: number,
  tripDate: string | null = null
): { stop: SupplyPoint; score: number; arrivalHour: number; isOpen: boolean | null }[] {
  const { strategy } = config;
  const isSunday = dayOfWeek === 0;
  const isTradingDay = isSunday && tripDate !== null && isTradingSunday(tripDate);

  // Build store preference scores from strategy
  const storePref: Record<string, number> = {};
  strategy.preferStoreType.forEach((type, i) => {
    storePref[type] = strategy.preferStoreType.length - i;
  });

  const ranked: { stop: SupplyPoint; score: number; arrivalHour: number; isOpen: boolean | null }[] = [];

  for (const stop of stops) {
    const arrivalHour = estimateArrivalHour(seg.startKm, stop.distanceFromStartKm, config.rideStartHour, config.avgSpeedKmh);
    const isOpen = stop.details?.is24h ? true : isOpenAt(stop.details?.openingHours, arrivalHour, dayOfWeek);

    // On non-trading Sundays: skip Biedronka entirely (Polish Sunday trading ban for large retailers)
    if (isSunday && !isTradingDay && !stop.details?.is24h && SUNDAY_CLOSED_TYPES.includes(stop.type)) {
      continue;
    }

    if (isOpen === false) continue;

    let score = storePref[stop.type] || 1;

    // Sunday penalties only apply on non-trading Sundays
    if (isSunday && !isTradingDay) {
      if (stop.details?.is24h || stop.type === 'paczkomat') {
        score += 8; // strong preference for 24h options on Sunday
      } else if (SUNDAY_REDUCED_HOURS_TYPES.includes(stop.type)) {
        score -= 1; // Żabka open but reduced hours (~10-18), slight penalty
      }
    }

    const progress = (stop.distanceFromStartKm - seg.startKm) / seg.distanceKm;
    if (strategy.preferEarlyStop) {
      if (progress <= 0.4) score += 5;
      else if (progress <= 0.6) score += 3;
      else score += 1;
    } else {
      score += 3;
    }

    if (isOpen === true) score += 2;

    ranked.push({ stop, score, arrivalHour, isOpen });
  }

  return ranked.sort((a, b) => b.score - a.score);
}

/**
 * Simulate consuming calories over a distance.
 * Reduces carry weight proportionally to calories burned.
 */
function consumeFood(
  carryCalories: number,
  carryWeightG: number,
  calsPerKm: number,
  distanceKm: number
): { calories: number; weightG: number } {
  const calsConsumed = distanceKm * calsPerKm;
  const ratio = carryCalories > 0 ? carryWeightG / carryCalories : 0;
  return {
    calories: Math.max(0, carryCalories - calsConsumed),
    weightG: Math.max(0, carryWeightG - calsConsumed * ratio),
  };
}

/**
 * Generate a resupply plan driven by the selected strategy.
 * Handles everything from "1 stop/day daily ration" to "stop at every shop."
 */
export function generateResupplyPlan(
  profile: DietProfile,
  daySegments: DaySegment[],
  supplyPoints: SupplyPoint[],
  supplyGaps: SupplyGap[],
  config: ResupplyConfig
): ResupplyPlan {
  if (daySegments.length === 0) {
    return { purchases: [], carryWeightCurve: [], maxCarryWeightG: 0, totalCalories: 0, totalWeightG: 0, warnings: [] };
  }

  const { strategy } = config;
  const foods = FOOD_DB[profile.type] || FOOD_DB.standard;
  const purchases: StopPurchase[] = [];
  const warnings: ResupplyWarning[] = [];
  const carryWeightCurve: CarryWeightPoint[] = [];

  const avgDailyDist = daySegments.reduce((s, d) => s + d.distanceKm, 0) / daySegments.length;
  const avgDailyAscent = daySegments.reduce((s, d) => s + d.ascentM, 0) / daySegments.length;
  const avgDailyCals = calculateDailyCalories(profile, avgDailyDist, avgDailyAscent);
  const calsPerKm = avgDailyCals / avgDailyDist;

  const dangerGaps = supplyGaps.filter((g) => g.severity === 'danger' || g.severity === 'caution');

  let carryCalories = 0;
  let carryWeightG = 0;

  for (const seg of daySegments) {
    const segCals = calculateDailyCalories(profile, seg.distanceKm, seg.ascentM);
    const dayOfWeek = getDayOfWeek(config.tripStartDate, seg.dayNumber);
    const isSunday = dayOfWeek === 0;
    const tripDate = tripDayDate(config.tripStartDate, seg.dayNumber);
    const isTradingDay = isSunday && tripDate !== null && isTradingSunday(tripDate);

    const segStops = supplyPoints
      .filter((sp) => FOOD_TYPES.includes(sp.type) && sp.distanceFromStartKm >= seg.startKm && sp.distanceFromStartKm <= seg.endKm)
      .sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);

    // Record carry weight at day start
    carryWeightCurve.push({
      distanceKm: seg.startKm,
      dayNumber: seg.dayNumber,
      foodWeightG: carryWeightG,
    });

    // Target calories: today + buffer days
    const bufferCals = strategy.carryBufferDays * avgDailyCals;
    let targetCals = Math.max(0, segCals + bufferCals - carryCalories);

    // On non-trading Sundays, add small buffer — Biedronka closed, some stores have reduced hours
    if (isSunday && !isTradingDay) {
      targetCals += avgDailyCals * SUNDAY_FOOD_BUFFER;
    }

    // Extra for danger gaps
    const nextGap = dangerGaps.find(
      (g) => g.startKm >= seg.startKm && g.startKm <= seg.endKm + DANGER_GAP_LOOKAHEAD_KM
    );
    if (nextGap) {
      const extraCals = nextGap.distanceKm * calsPerKm * DANGER_GAP_EXTRA_CALORIE_FACTOR;
      targetCals += extraCals;
      warnings.push({
        type: 'long_carry',
        message: `Day ${seg.dayNumber}: Extra ration for ${nextGap.distanceKm.toFixed(0)} km gap ahead`,
        dayNumber: seg.dayNumber,
        distanceKm: seg.startKm,
        severity: 'info',
      });
    }

    // Sunday warning
    if (isSunday) {
      const dayName = new Date(config.tripStartDate ? config.tripStartDate + 'T00:00:00' : Date.now());
      dayName.setDate(dayName.getDate() + seg.dayNumber - 1);
      const dateStr = dayName.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      if (isTradingDay) {
        warnings.push({
          type: 'sunday_trading',
          message: `Day ${seg.dayNumber} (${dateStr}): Trading Sunday — all shops open`,
          dayNumber: seg.dayNumber,
          distanceKm: seg.startKm,
          severity: 'info',
        });
      } else {
        warnings.push({
          type: 'sunday_closed',
          message: `Day ${seg.dayNumber} (${dateStr}): Sunday — Biedronka closed, Żabka has reduced hours. Consider stocking up Saturday.`,
          dayNumber: seg.dayNumber,
          distanceKm: seg.startKm,
          severity: 'warning',
        });
      }
    }

    // Rank available stops (Sunday-aware, trading-Sunday-aware)
    const ranked = rankStops(segStops, seg, config, dayOfWeek, tripDate);

    // Pick up to maxStopsPerDay
    const stopsToUse = ranked.slice(0, strategy.maxStopsPerDay);
    // Sort selected stops by distance (ride order)
    stopsToUse.sort((a, b) => a.stop.distanceFromStartKm - b.stop.distanceFromStartKm);

    let stopsUsed = 0;
    let lastStopKm = seg.startKm;

    if (stopsToUse.length === 0 && targetCals > 0) {
      // No usable stops this day
      if (carryCalories < segCals * 0.5) {
        warnings.push({
          type: 'calorie_deficit',
          message: `Day ${seg.dayNumber}: No open food stops — only ${carryCalories.toFixed(0)} cal in reserves`,
          dayNumber: seg.dayNumber,
          distanceKm: seg.startKm,
          severity: carryCalories < segCals * 0.2 ? 'danger' : 'warning',
        });
      }
    }

    for (const { stop, arrivalHour, isOpen } of stopsToUse) {
      if (targetCals <= 0 && carryCalories >= strategy.minCalorieReserve) continue;

      // Simulate consumption from last point to this stop
      const dist = stop.distanceFromStartKm - lastStopKm;
      const consumed = consumeFood(carryCalories, carryWeightG, calsPerKm, dist);
      carryCalories = consumed.calories;
      carryWeightG = consumed.weightG;

      // How much to buy at this stop
      let calsToGet: number;
      if (strategy.maxStopsPerDay === 1) {
        // Single-stop: buy full remaining target
        calsToGet = targetCals;
      } else {
        // Multi-stop: split across remaining stops
        const remainingStops = stopsToUse.length - stopsUsed;
        calsToGet = Math.max(targetCals / remainingStops, strategy.minCalorieReserve);
      }

      if (calsToGet < 200) {
        lastStopKm = stop.distanceFromStartKm;
        stopsUsed++;
        continue;
      }

      const items = selectFoodForStop(foods, stop.type, calsToGet);
      const totalCals = items.reduce((s, f) => s + f.calories, 0);
      const totalWeight = items.reduce((s, f) => s + f.weightG, 0);

      carryCalories += totalCals;
      carryWeightG += totalWeight;
      targetCals = Math.max(0, targetCals - totalCals);

      purchases.push({
        stopId: stop.id,
        stopName: stop.name,
        stopType: stop.type,
        distanceKm: stop.distanceFromStartKm,
        dayNumber: seg.dayNumber,
        estimatedArrivalHour: arrivalHour,
        isOpenOnArrival: isOpen,
        items,
        totalCalories: totalCals,
        totalWeightG: totalWeight,
        source: 'shop',
      });

      carryWeightCurve.push({
        distanceKm: stop.distanceFromStartKm,
        dayNumber: seg.dayNumber,
        foodWeightG: carryWeightG,
      });

      if (isOpen === null) {
        warnings.push({
          type: 'closed_store',
          message: `${stop.name} (km ${stop.distanceFromStartKm.toFixed(0)}): Opening hours unknown`,
          dayNumber: seg.dayNumber,
          distanceKm: stop.distanceFromStartKm,
          severity: 'info',
        });
      }

      lastStopKm = stop.distanceFromStartKm;
      stopsUsed++;
    }

    // Consume from last stop to day end
    const endDist = seg.endKm - lastStopKm;
    const endConsumed = consumeFood(carryCalories, carryWeightG, calsPerKm, endDist);
    carryCalories = endConsumed.calories;
    carryWeightG = endConsumed.weightG;

    // Record end-of-day weight
    carryWeightCurve.push({
      distanceKm: seg.endKm,
      dayNumber: seg.dayNumber,
      foodWeightG: carryWeightG,
    });

    // Heavy load warning
    const peakWeight = Math.max(...carryWeightCurve.filter((p) => p.dayNumber === seg.dayNumber).map((p) => p.foodWeightG));
    if (peakWeight > HEAVY_LOAD_WARNING_G) {
      warnings.push({
        type: 'heavy_load',
        message: `Day ${seg.dayNumber}: Food weight peaks at ${(peakWeight / 1000).toFixed(1)} kg`,
        dayNumber: seg.dayNumber,
        distanceKm: seg.startKm,
        severity: 'warning',
      });
    }
  }

  const maxCarryWeightG = Math.max(0, ...carryWeightCurve.map((p) => p.foodWeightG));
  const totalCalories = purchases.reduce((s, p) => s + p.totalCalories, 0);
  const totalWeightG = purchases.reduce((s, p) => s + p.totalWeightG, 0);

  return { purchases, carryWeightCurve, maxCarryWeightG, totalCalories, totalWeightG, warnings };
}
