import { useEffect } from 'react';
import { useRouteStore } from '../store/routeStore';
import { useSupplyStore } from '../store/supplyStore';
import { useTripStore } from '../store/tripStore';
import { DIET_PROFILES } from '../services/diet';
import { RESUPPLY_PRESETS, autoDetectStrategy } from '../services/resupplyPlanner';
import { generateUnifiedPlan } from '../services/unifiedPlan';
import { debugLog } from '../utils/debugLogger';
import type { UnifiedShoppingPlan } from '../types';

const DEBOUNCE_MS = 800;

/** Ship a parcel every N days when Paczkomat pre-shipping is on. */
const PACZKOMAT_INTERVAL_DAYS = 3;
const PACZKOMAT_LEAD_TIME_DAYS = 2;

/**
 * Build the resupply plan from the current store state. The only place the
 * 'auto' strategy is resolved, so every caller gets the same plan.
 */
export function buildPlanFromStores(): UnifiedShoppingPlan {
  const route = useRouteStore.getState();
  const supply = useSupplyStore.getState();
  const trip = useTripStore.getState();

  // Lockers are food only when we ship parcels to them.
  const points = trip.paczkomatShipping
    ? supply.supplyPoints
    : supply.supplyPoints.filter((p) => p.type !== 'paczkomat');

  const strategy = trip.strategyId === 'auto' && route.routeStats
    ? RESUPPLY_PRESETS[autoDetectStrategy(points, route.routeStats.distanceKm).strategyId]
    : RESUPPLY_PRESETS[trip.strategyId];

  return generateUnifiedPlan(
    DIET_PROFILES[trip.diet],
    route.daySegments,
    points,
    supply.supplyGaps,
    trip.paczkomatShipping
      ? {
          intervalDays: PACZKOMAT_INTERVAL_DAYS,
          prefer24h: true,
          preferNearNightStop: true,
          tripStartDate: trip.tripStartDate,
          leadTimeDays: PACZKOMAT_LEAD_TIME_DAYS,
        }
      : null,
    {
      rideStartHour: trip.rideStartHour,
      avgSpeedKmh: trip.avgSpeedKmh,
      tripStartDate: trip.tripStartDate,
      strategy,
    },
  );
}

/**
 * Regenerates the resupply plan (debounced) whenever one of its inputs
 * changes, once the route has day segments and supply points are loaded.
 */
export function useAutoPlan(): void {
  const daySegments = useRouteStore((s) => s.daySegments);
  const routeStats = useRouteStore((s) => s.routeStats);
  const isCalculating = useRouteStore((s) => s.isCalculating);
  const supplyPoints = useSupplyStore((s) => s.supplyPoints);
  const supplyGaps = useSupplyStore((s) => s.supplyGaps);
  const isLoading = useSupplyStore((s) => s.isLoading);
  const osmFailed = useSupplyStore((s) => s.osmFailed);
  const tripStartDate = useTripStore((s) => s.tripStartDate);
  const rideStartHour = useTripStore((s) => s.rideStartHour);
  const avgSpeedKmh = useTripStore((s) => s.avgSpeedKmh);
  const strategyId = useTripStore((s) => s.strategyId);
  const diet = useTripStore((s) => s.diet);
  const paczkomatShipping = useTripStore((s) => s.paczkomatShipping);
  const setPlan = useTripStore((s) => s.setPlan);

  useEffect(() => {
    // With OpenStreetMap unreachable the shops are unknown, and a plan built
    // from lockers alone would read as "nothing to buy on this route".
    const noShops = supplyPoints.length === 0 || osmFailed;
    if (daySegments.length === 0 || noShops || isCalculating || isLoading) {
      // No plan can be built from settled inputs: drop the old one rather
      // than show the previous route's purchases against this route.
      if (daySegments.length === 0 || (noShops && !isCalculating && !isLoading)) setPlan(null);
      return;
    }
    const timer = setTimeout(() => {
      try {
        const plan = buildPlanFromStores();
        setPlan(plan);
        debugLog.info('plan', 'generated', { purchases: plan.resupply.purchases.length, warnings: plan.resupply.warnings.length });
      } catch (err) {
        debugLog.error('plan', 'failed', err instanceof Error ? err.message : String(err));
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [
    daySegments, routeStats, isCalculating, supplyPoints, supplyGaps, isLoading, osmFailed,
    tripStartDate, rideStartHour, avgSpeedKmh, strategyId, diet, paczkomatShipping, setPlan,
  ]);
}
