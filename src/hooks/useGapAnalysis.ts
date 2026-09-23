import { useEffect } from 'react';
import { useRouteStore } from '../store/routeStore';
import { useSupplyStore } from '../store/supplyStore';
import { useTripStore } from '../store/tripStore';
import { analyzeWaterGaps } from '../services/gapAnalysis';
import { generateWaterPlan } from '../services/waterPlanner';

const HEAT_THRESHOLD_C = 30;

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

  useEffect(() => {
    if (!routeWeather) return;
    const totalDistKm = useRouteStore.getState().routeStats?.distanceKm ?? 0;
    if (supplyPoints.length === 0 || totalDistKm <= 0) return;
    const maxTempC = Math.max(...routeWeather.days.map((d) => d.tempMax));
    if (maxTempC <= HEAT_THRESHOLD_C) return;
    setWaterGaps(analyzeWaterGaps(supplyPoints, totalDistKm, maxTempC));
  }, [routeWeather, supplyPoints, setWaterGaps]);

  useEffect(() => {
    if (daySegments.length === 0) {
      setWaterPlan(null);
      return;
    }
    setWaterPlan(generateWaterPlan(daySegments, supplyPoints, routeWeather, waterCapacityL));
  }, [routeWeather, waterCapacityL, daySegments, supplyPoints, setWaterPlan]);
}
