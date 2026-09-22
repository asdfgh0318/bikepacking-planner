import { useEffect } from 'react';
import { useRouteStore } from '../store/routeStore';
import { useSupplyStore } from '../store/supplyStore';
import { useDietStore } from '../store/dietStore';
import { useResupplyStore } from '../store/resupplyStore';
import { DIET_PROFILES } from '../services/diet';
import { RESUPPLY_PRESETS, autoDetectStrategy } from '../services/resupplyPlanner';
import { generateUnifiedPlan } from '../services/unifiedPlan';
import { debugLog } from '../utils/debugLogger';
import type { UnifiedShoppingPlan } from '../types';

const DEBOUNCE_MS = 1000;

/**
 * Build the resupply plan from the current store state. Shared by the
 * automatic regeneration below and the manual "Generate" button, so both
 * resolve the 'auto' strategy the same way.
 */
export function buildPlanFromStores(): UnifiedShoppingPlan {
  const route = useRouteStore.getState();
  const supply = useSupplyStore.getState();
  const diet = useDietStore.getState();
  const resupply = useResupplyStore.getState();

  const strategy = resupply.strategyId === 'auto' && route.routeStats
    ? RESUPPLY_PRESETS[autoDetectStrategy(supply.supplyPoints, route.routeStats.distanceKm).strategyId]
    : resupply.strategy;

  return generateUnifiedPlan(
    DIET_PROFILES[diet.selectedDiet],
    route.daySegments,
    supply.supplyPoints,
    supply.supplyGaps,
    resupply.enablePaczkomatShipping ? resupply.paczkomatConfig : null,
    { ...resupply.resupplyConfig, strategy, tripContext: resupply.tripContext },
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
  const selectedDiet = useDietStore((s) => s.selectedDiet);
  const strategyId = useResupplyStore((s) => s.strategyId);
  const strategy = useResupplyStore((s) => s.strategy);
  const resupplyConfig = useResupplyStore((s) => s.resupplyConfig);
  const tripContext = useResupplyStore((s) => s.tripContext);
  const enablePaczkomatShipping = useResupplyStore((s) => s.enablePaczkomatShipping);
  const paczkomatConfig = useResupplyStore((s) => s.paczkomatConfig);
  const setUnifiedPlan = useResupplyStore((s) => s.setUnifiedPlan);

  useEffect(() => {
    if (daySegments.length === 0 || supplyPoints.length === 0) return;
    if (isCalculating || isLoading) return;

    const timer = setTimeout(() => {
      try {
        const plan = buildPlanFromStores();
        setUnifiedPlan(plan);
        debugLog.info('plan', 'auto-generated', {
          purchases: plan.resupply.purchases.length,
          warnings: plan.resupply.warnings.length,
        });
      } catch (err) {
        debugLog.error('plan', 'auto-generate failed', err instanceof Error ? err.message : String(err));
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [
    daySegments, routeStats, isCalculating, supplyPoints, supplyGaps, isLoading,
    selectedDiet, strategyId, strategy, resupplyConfig, tripContext,
    enablePaczkomatShipping, paczkomatConfig, setUnifiedPlan,
  ]);
}
