import type { SupplyPoint, DaySegment, DayWeather } from '../types';

export interface WaterLevelPoint {
  km: number;
  dayNumber: number;
  liters: number;
}

export interface WaterCriticalPoint {
  km: number;
  dayNumber: number;
  liters: number;
  nearestSourceName: string;
  nearestSourceKm: number;
  distanceToSource: number;
}

export interface WaterPlan {
  levelCurve: WaterLevelPoint[];
  criticalPoints: WaterCriticalPoint[];
  recommendations: string[];
  totalConsumptionL: number;
  refillCount: number;
}

// Base consumption rate: 0.5 L/hr
const BASE_CONSUMPTION_L_PER_HR = 0.5;
// Extra consumption per 5°C above 25°C: +0.2 L/hr
const HEAT_EXTRA_L_PER_5C = 0.2;
const HEAT_THRESHOLD_C = 25;
// Critical water level warning threshold
const CRITICAL_WATER_L = 0.3;

export function getConsumptionRate(maxTempC: number): number {
  if (maxTempC <= HEAT_THRESHOLD_C) return BASE_CONSUMPTION_L_PER_HR;
  const extraDegrees = maxTempC - HEAT_THRESHOLD_C;
  return BASE_CONSUMPTION_L_PER_HR + (extraDegrees / 5) * HEAT_EXTRA_L_PER_5C;
}

export function generateWaterPlan(
  daySegments: DaySegment[],
  supplyPoints: SupplyPoint[],
  weather: { days: DayWeather[] } | null,
  waterCapacityL: number,
): WaterPlan {
  const waterSources = supplyPoints
    .filter(p => p.type === 'water')
    .sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);

  const levelCurve: WaterLevelPoint[] = [];
  const criticalPoints: WaterCriticalPoint[] = [];
  const recommendations: string[] = [];
  let currentWater = waterCapacityL;
  let totalConsumption = 0;
  let refillCount = 0;

  for (const seg of daySegments) {
    // Get temperature for this day
    const dayWeather = weather?.days.find(d => d.dayNumber === seg.dayNumber);
    const maxTemp = dayWeather?.tempMax ?? 20; // default 20°C if no weather
    const consumptionRate = getConsumptionRate(maxTemp);

    const segmentKms = seg.endKm - seg.startKm;
    const consumptionPerKm = (consumptionRate * seg.estimatedHours) / segmentKms;

    // Walk km by km through this segment
    for (let km = seg.startKm; km <= seg.endKm; km += 1) {
      // Check if there's a water source at this km (within 0.5km tolerance)
      const source = waterSources.find(s =>
        Math.abs(s.distanceFromStartKm - km) < 0.5
      );

      if (source) {
        if (currentWater < waterCapacityL * 0.8) {
          // Worth recommending a refill
          const nextSource = waterSources.find(s => s.distanceFromStartKm > km + 1);
          const distToNext = nextSource ? nextSource.distanceFromStartKm - km : 999;
          recommendations.push(
            `Fill up at km ${km.toFixed(0)} (${source.name}) — next source ${distToNext.toFixed(0)}km away`
          );
        }
        currentWater = waterCapacityL; // refill
        refillCount++;
      }

      // Consume water
      currentWater = Math.max(0, currentWater - consumptionPerKm);
      totalConsumption += consumptionPerKm;

      levelCurve.push({
        km: Math.round(km),
        dayNumber: seg.dayNumber,
        liters: parseFloat(currentWater.toFixed(2)),
      });

      // Check critical level
      if (currentWater < CRITICAL_WATER_L) {
        const nearest = waterSources.reduce((best, s) => {
          const dist = Math.abs(s.distanceFromStartKm - km);
          return !best || dist < best.dist ? { source: s, dist } : best;
        }, null as { source: SupplyPoint; dist: number } | null);

        if (nearest) {
          criticalPoints.push({
            km,
            dayNumber: seg.dayNumber,
            liters: currentWater,
            nearestSourceName: nearest.source.name,
            nearestSourceKm: nearest.source.distanceFromStartKm,
            distanceToSource: nearest.dist,
          });
        }
      }
    }

    // Start of new day: don't auto-refill (rider sleeps with whatever they have,
    // but assume they start next day having refilled at camp)
    currentWater = waterCapacityL;
  }

  return {
    levelCurve,
    criticalPoints,
    recommendations,
    totalConsumptionL: parseFloat(totalConsumption.toFixed(1)),
    refillCount,
  };
}
