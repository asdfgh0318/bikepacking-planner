/**
 * Automatic store watchers — subscribes to all Zustand stores
 * and logs every state change without any manual intervention.
 */
import { debugLog } from './debugLogger';
import { useRouteStore } from '../store/routeStore';
import { useSupplyStore } from '../store/supplyStore';
import { useDietStore } from '../store/dietStore';
import { useResupplyStore } from '../store/resupplyStore';
import { useBudgetStore } from '../store/budgetStore';
import { useGearStore } from '../store/gearStore';
import { DIET_PROFILES } from '../services/diet';
import { generateUnifiedPlan } from '../services/unifiedPlan';

/** Diff two plain objects, return changed keys */
function diff(prev: Record<string, unknown>, next: Record<string, unknown>): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of new Set([...Object.keys(prev), ...Object.keys(next)])) {
    if (typeof prev[key] === 'function' || typeof next[key] === 'function') continue;
    const p = prev[key];
    const n = next[key];
    // Shallow comparison — arrays/objects compared by reference
    if (p !== n) {
      changes[key] = { from: summarize(p), to: summarize(n) };
    }
  }
  return changes;
}

/** Summarize a value for logging (avoid huge payloads) */
function summarize(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return `Array(${v.length})`;
  if (typeof v === 'object') {
    const keys = Object.keys(v as Record<string, unknown>);
    if (keys.length > 5) return `{${keys.slice(0, 3).join(', ')}, ...+${keys.length - 3}}`;
    return v;
  }
  return v;
}

let initialized = false;

export function initAutoWatch() {
  if (initialized) return;
  initialized = true;

  debugLog.info('autowatch', 'init', 'Subscribing to all stores');

  // --- Route Store ---
  let prevRoute = { ...useRouteStore.getState() };
  useRouteStore.subscribe((state) => {
    const changes = diff(prevRoute as unknown as Record<string, unknown>, state as unknown as Record<string, unknown>);
    prevRoute = { ...state };
    if (Object.keys(changes).length === 0) return;

    for (const [key, { to }] of Object.entries(changes)) {
      if (key === 'isCalculating') {
        debugLog.debug('store:route', `isCalculating=${to}`);
      } else if (key === 'waypoints') {
        const wps = state.waypoints;
        debugLog.info('store:route', 'waypoints:changed', { count: wps.length, last: wps.length > 0 ? `${wps[wps.length - 1].lat.toFixed(4)},${wps[wps.length - 1].lng.toFixed(4)}` : null });
      } else if (key === 'routeGeometry') {
        debugLog.info('store:route', 'geometry:updated', state.routeGeometry ? { points: state.routeGeometry.coordinates.length } : 'null');
      } else if (key === 'routeStats') {
        debugLog.info('store:route', 'stats:updated', state.routeStats);
      } else if (key === 'daySegments') {
        debugLog.info('store:route', 'daySegments:updated', { count: state.daySegments.length });
      } else if (key === 'dailyTargetKm') {
        debugLog.info('store:route', 'dailyTargetKm:changed', to);
      } else if (key === 'routingProfile') {
        debugLog.info('store:route', 'routingProfile:changed', to);
      }
    }
  });

  // --- Supply Store ---
  let prevSupply = { ...useSupplyStore.getState() };
  useSupplyStore.subscribe((state) => {
    const changes = diff(prevSupply as unknown as Record<string, unknown>, state as unknown as Record<string, unknown>);
    prevSupply = { ...state };
    if (Object.keys(changes).length === 0) return;

    for (const [key, { to }] of Object.entries(changes)) {
      if (key === 'isLoading') {
        debugLog.debug('store:supply', `isLoading=${to}`);
      } else if (key === 'supplyPoints') {
        const byType: Record<string, number> = {};
        for (const sp of state.supplyPoints) byType[sp.type] = (byType[sp.type] || 0) + 1;
        debugLog.info('store:supply', 'supplyPoints:updated', { total: state.supplyPoints.length, ...byType });
      } else if (key === 'supplyGaps') {
        debugLog.info('store:supply', 'supplyGaps:updated', { count: state.supplyGaps.length });
      } else if (key === 'corridorWidthKm') {
        debugLog.info('store:supply', 'corridorWidth:changed', to);
      } else if (key.startsWith('show')) {
        debugLog.debug('store:supply', `${key}:changed`, to);
      }
    }
  });

  // --- Diet Store ---
  let prevDiet = { ...useDietStore.getState() };
  useDietStore.subscribe((state) => {
    const changes = diff(prevDiet as unknown as Record<string, unknown>, state as unknown as Record<string, unknown>);
    prevDiet = { ...state };
    if (Object.keys(changes).length === 0) return;
    for (const [key, { to }] of Object.entries(changes)) {
      debugLog.info('store:diet', `${key}:changed`, to);
    }
  });

  // --- Resupply Store ---
  let prevResupply = { ...useResupplyStore.getState() };
  useResupplyStore.subscribe((state) => {
    const changes = diff(prevResupply as unknown as Record<string, unknown>, state as unknown as Record<string, unknown>);
    prevResupply = { ...state };
    if (Object.keys(changes).length === 0) return;

    for (const [key, { to }] of Object.entries(changes)) {
      if (key === 'isPlanning') {
        debugLog.debug('store:resupply', `isPlanning=${to}`);
      } else if (key === 'strategyId') {
        debugLog.info('store:resupply', 'strategy:changed', to);
      } else if (key === 'unifiedPlan') {
        if (state.unifiedPlan) {
          debugLog.info('store:resupply', 'plan:set', {
            purchases: state.unifiedPlan.resupply.purchases.length,
            totalCal: state.unifiedPlan.resupply.totalCalories,
            maxWeightG: state.unifiedPlan.resupply.maxCarryWeightG,
            warnings: state.unifiedPlan.resupply.warnings.length,
            parcels: state.unifiedPlan.shipping?.totalParcels ?? 0,
          });
        } else {
          debugLog.info('store:resupply', 'plan:cleared');
        }
      } else if (key === 'activeView') {
        debugLog.debug('store:resupply', `view:${to}`);
      } else {
        debugLog.debug('store:resupply', `${key}:changed`, to);
      }
    }
  });

  // --- Budget Store ---
  let prevBudget = { ...useBudgetStore.getState() };
  useBudgetStore.subscribe((state) => {
    const changes = diff(prevBudget as unknown as Record<string, unknown>, state as unknown as Record<string, unknown>);
    prevBudget = { ...state };
    if (Object.keys(changes).length === 0) return;
    for (const [key, { to }] of Object.entries(changes)) {
      debugLog.debug('store:budget', `${key}:changed`, to);
    }
  });

  // --- Gear Store ---
  let prevGear = { ...useGearStore.getState() };
  useGearStore.subscribe((state) => {
    const changes = diff(prevGear as unknown as Record<string, unknown>, state as unknown as Record<string, unknown>);
    prevGear = { ...state };
    if (Object.keys(changes).length === 0) return;
    for (const [key, { to }] of Object.entries(changes)) {
      debugLog.debug('store:gear', `${key}:changed`, to);
    }
  });

  // --- Auto-generate resupply plan when inputs change ---
  let autoGenTimer: ReturnType<typeof setTimeout> | null = null;

  function tryAutoGenerate() {
    if (autoGenTimer) clearTimeout(autoGenTimer);
    // Debounce 1s to avoid spam during rapid changes
    autoGenTimer = setTimeout(() => {
      const route = useRouteStore.getState();
      const supply = useSupplyStore.getState();
      const diet = useDietStore.getState();
      const resupply = useResupplyStore.getState();

      if (route.daySegments.length === 0) return;
      if (supply.supplyPoints.length === 0) return;
      if (route.isCalculating || supply.isLoading) return;

      debugLog.info('auto', 'plan:auto-generate', {
        days: route.daySegments.length,
        points: supply.supplyPoints.length,
        strategy: resupply.strategyId,
      });

      try {
        const profile = DIET_PROFILES[diet.selectedDiet];
        const plan = generateUnifiedPlan(
          profile,
          route.daySegments,
          supply.supplyPoints,
          supply.supplyGaps,
          resupply.enablePaczkomatShipping ? resupply.paczkomatConfig : null,
          { ...resupply.resupplyConfig, strategy: resupply.strategy, tripContext: resupply.tripContext }
        );
        resupply.setUnifiedPlan(plan);
        debugLog.info('auto', 'plan:auto-success', {
          purchases: plan.resupply.purchases.length,
          totalCal: plan.resupply.totalCalories,
          warnings: plan.resupply.warnings.length,
        });
      } catch (err) {
        debugLog.error('auto', 'plan:auto-fail', err instanceof Error ? err.message : String(err));
      }
    }, 1000);
  }

  // Watch all inputs that should trigger auto-generation
  useRouteStore.subscribe((state, prev) => {
    if (state.daySegments !== prev.daySegments && state.daySegments.length > 0) tryAutoGenerate();
  });
  useSupplyStore.subscribe((state, prev) => {
    if (state.supplyPoints !== prev.supplyPoints && state.supplyPoints.length > 0) tryAutoGenerate();
    if (state.supplyGaps !== prev.supplyGaps) tryAutoGenerate();
  });
  useDietStore.subscribe((state, prev) => {
    if (state.selectedDiet !== prev.selectedDiet) tryAutoGenerate();
  });
  useResupplyStore.subscribe((state, prev) => {
    if (state.strategyId !== prev.strategyId) tryAutoGenerate();
    if (state.strategy !== prev.strategy) tryAutoGenerate();
    if (state.resupplyConfig !== prev.resupplyConfig) tryAutoGenerate();
    if (state.enablePaczkomatShipping !== prev.enablePaczkomatShipping) tryAutoGenerate();
    if (state.paczkomatConfig !== prev.paczkomatConfig) tryAutoGenerate();
  });

  // --- Global error catcher ---
  window.addEventListener('error', (e) => {
    debugLog.error('global', 'uncaught:error', { message: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno });
  });
  window.addEventListener('unhandledrejection', (e) => {
    debugLog.error('global', 'unhandled:rejection', String(e.reason));
  });

  debugLog.info('autowatch', 'ready', 'All store watchers + auto-generate active');
}
