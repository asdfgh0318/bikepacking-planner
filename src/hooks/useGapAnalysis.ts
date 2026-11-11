import { useEffect } from 'react';
import { useRouteStore } from '../store/routeStore';
import { useSupplyStore } from '../store/supplyStore';
import { useTripStore } from '../store/tripStore';
import { analyzeWaterGaps, heatTempForWaterGaps } from '../services/gapAnalysis';
import { generateWaterPlan } from '../services/waterPlanner';

/**
 * Secondary analyses that depend on weather: heat-tightened water gaps and
 * the water consumption plan. The primary food/water gap analysis runs in
 * useSupplyPointFetching as soon as supply points load.
 */
export function useGapAnalysis(): void {
  const routeWeather = useTripStore((s) => s.routeWeather);
  const waterCapacityL = useTripStore((s) => s.waterCapacityL);
  const setWaterPlan = useTripStore((s) => s.setWaterPlan);
  const setWaterGaps = useSupplyStore((s) => s.setWaterGaps);
  const daySegments = useRouteStore((s) => s.daySegments);
  const supplyPoints = useSupplyStore((s) => s.supplyPoints);
  // OpenStreetMap unreachable: water sources are unknown, so no water verdicts.
  const osmFailed = useSupplyStore((s) => s.osmFailed);

  useEffect(() => {
    const totalDistKm = useRouteStore.getState().routeStats?.distanceKm ?? 0;
    if (osmFailed || supplyPoints.length === 0 || totalDistKm <= 0) return;
    // Always recompute: a cooler or missing forecast must relax the gaps
    // that a hot one tightened.
    setWaterGaps(analyzeWaterGaps(supplyPoints, totalDistKm, heatTempForWaterGaps(routeWeather)));
  }, [routeWeather, supplyPoints, osmFailed, setWaterGaps]);

  useEffect(() => {
    if (daySegments.length === 0 || osmFailed) {
      setWaterPlan(null);
      return;
    }
    setWaterPlan(generateWaterPlan(daySegments, supplyPoints, routeWeather, waterCapacityL));
  }, [routeWeather, waterCapacityL, daySegments, supplyPoints, osmFailed, setWaterPlan]);
}
