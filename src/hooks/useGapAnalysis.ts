import { useEffect } from 'react';
import { useRouteStore } from '../store/routeStore';
import { useSupplyStore } from '../store/supplyStore';
import { useResupplyStore } from '../store/resupplyStore';
import { analyzeWaterGaps } from '../services/gapAnalysis';
import { generateWaterPlan } from '../services/waterPlanner';
import { debugLog } from '../utils/debugLogger';

/**
 * Re-analyzes water gaps when weather data arrives.
 * If the max forecast temperature exceeds 30 C, water gap thresholds
 * are tightened (heat-adjusted) so the user is warned earlier.
 *
 * Also generates a water consumption plan (water level curve, critical points,
 * recommendations) whenever day segments, supply points, weather, or
 * water capacity change.
 *
 * Note: The initial gap analysis (food + water) runs inside useSupplyPointFetching
 * right after supply points are loaded. This hook only handles the secondary
 * weather-adjusted re-analysis and the water plan generation.
 */
export function useGapAnalysis(): void {
  const routeWeather = useResupplyStore((s) => s.routeWeather);
  const waterCapacityL = useResupplyStore((s) => s.waterCapacityL);
  const setWaterPlan = useResupplyStore((s) => s.setWaterPlan);
  const setWaterGaps = useSupplyStore((s) => s.setWaterGaps);

  // Heat-adjusted water gap re-analysis
  useEffect(() => {
    if (!routeWeather) return;
    const supplyPoints = useSupplyStore.getState().supplyPoints;
    const routeStats = useRouteStore.getState().routeStats;
    const totalDistKm = routeStats?.distanceKm ?? 0;
    if (supplyPoints.length === 0 || totalDistKm <= 0) return;
    const maxTempC = Math.max(...routeWeather.days.map(d => d.tempMax));
    if (maxTempC <= 30) return; // no adjustment needed
    const wGaps = analyzeWaterGaps(supplyPoints, totalDistKm, maxTempC);
    setWaterGaps(wGaps);
    debugLog.info('supply', 'waterGaps:heat-adjusted', {
      maxTempC, waterGaps: wGaps.length,
      waterDangers: wGaps.filter(g => g.severity === 'danger').length,
    });
  }, [routeWeather, setWaterGaps]);

  // Water consumption plan generation
  useEffect(() => {
    const daySegments = useRouteStore.getState().daySegments;
    const supplyPoints = useSupplyStore.getState().supplyPoints;
    if (daySegments.length === 0) {
      setWaterPlan(null);
      return;
    }
    const plan = generateWaterPlan(daySegments, supplyPoints, routeWeather, waterCapacityL);
    setWaterPlan(plan);
    debugLog.info('supply', 'waterPlan:generated', {
      totalConsumptionL: plan.totalConsumptionL,
      refillCount: plan.refillCount,
      criticalPoints: plan.criticalPoints.length,
      recommendations: plan.recommendations.length,
    });
  }, [routeWeather, waterCapacityL, setWaterPlan]);
}
