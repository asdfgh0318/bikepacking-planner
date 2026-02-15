import { create } from 'zustand';
import type { PaczkomatConfig, ResupplyStrategy, ResupplyStrategyId, UnifiedShoppingPlan, TripContext, Season, RouteWeather } from '../types';
import type { WaterPlan } from '../services/waterPlanner';
import { RESUPPLY_PRESETS } from '../services/resupplyPlanner';

// Season defaults (Poland, ~52°N latitude)
const SEASON_DEFAULTS: Record<Season, Omit<TripContext, 'season'>> = {
  spring: { daylightHours: 12, waterMultiplier: 1.0, extraGearWeightG: 1000 },
  summer: { daylightHours: 15, waterMultiplier: 1.5, extraGearWeightG: 0 },
  autumn: { daylightHours: 10, waterMultiplier: 1.0, extraGearWeightG: 1500 },
  winter: { daylightHours: 7, waterMultiplier: 0.8, extraGearWeightG: 3000 },
};

export { SEASON_DEFAULTS };

interface ResupplyState {
  enablePaczkomatShipping: boolean;
  paczkomatConfig: PaczkomatConfig;
  resupplyConfig: { rideStartHour: number; avgSpeedKmh: number; tripStartDate: string };
  strategyId: ResupplyStrategyId;
  strategy: ResupplyStrategy;
  tripContext: TripContext;
  routeWeather: RouteWeather | null;
  isLoadingWeather: boolean;
  showWeatherMarkers: boolean;
  unifiedPlan: UnifiedShoppingPlan | null;
  isPlanning: boolean;
  activeView: 'timeline' | 'checklist' | 'shopping' | 'weight';
  waterCapacityL: number;
  waterPlan: WaterPlan | null;

  setEnablePaczkomatShipping: (v: boolean) => void;
  setPaczkomatConfig: <K extends keyof PaczkomatConfig>(key: K, value: PaczkomatConfig[K]) => void;
  setResupplyConfig: <K extends keyof ResupplyState['resupplyConfig']>(
    key: K,
    value: ResupplyState['resupplyConfig'][K]
  ) => void;
  setStrategyId: (id: ResupplyStrategyId) => void;
  setStrategyParam: <K extends keyof ResupplyStrategy>(key: K, value: ResupplyStrategy[K]) => void;
  setSeason: (season: Season) => void;
  setTripContext: <K extends keyof TripContext>(key: K, value: TripContext[K]) => void;
  setRouteWeather: (weather: RouteWeather | null) => void;
  setIsLoadingWeather: (v: boolean) => void;
  setShowWeatherMarkers: (v: boolean) => void;
  setUnifiedPlan: (plan: UnifiedShoppingPlan | null) => void;
  setIsPlanning: (v: boolean) => void;
  setActiveView: (v: ResupplyState['activeView']) => void;
  setWaterCapacityL: (v: number) => void;
  setWaterPlan: (p: WaterPlan | null) => void;
}

export const useResupplyStore = create<ResupplyState>((set) => ({
  enablePaczkomatShipping: false,
  paczkomatConfig: {
    intervalDays: 3,
    prefer24h: true,
    preferNearNightStop: true,
    tripStartDate: new Date().toISOString().split('T')[0],
    leadTimeDays: 2,
  },
  resupplyConfig: {
    rideStartHour: 7,
    avgSpeedKmh: 15,
    tripStartDate: new Date().toISOString().split('T')[0],
  },
  strategyId: 'auto',
  strategy: { ...RESUPPLY_PRESETS['auto'] },
  tripContext: { season: 'summer', ...SEASON_DEFAULTS.summer },
  routeWeather: null,
  isLoadingWeather: false,
  showWeatherMarkers: true,
  unifiedPlan: null,
  isPlanning: false,
  activeView: 'timeline',
  waterCapacityL: 2.0,
  waterPlan: null,

  setEnablePaczkomatShipping: (v) => set({ enablePaczkomatShipping: v }),
  setPaczkomatConfig: (key, value) =>
    set((s) => ({ paczkomatConfig: { ...s.paczkomatConfig, [key]: value } })),
  setResupplyConfig: (key, value) =>
    set((s) => {
      if (key === 'tripStartDate') {
        const dateStr = value as string;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || isNaN(new Date(dateStr).getTime())) {
          return s;
        }
      }
      return { resupplyConfig: { ...s.resupplyConfig, [key]: value } };
    }),
  setStrategyId: (id) =>
    set({ strategyId: id, strategy: { ...RESUPPLY_PRESETS[id] } }),
  setStrategyParam: (key, value) =>
    set((s) => ({ strategyId: 'custom' as ResupplyStrategyId, strategy: { ...s.strategy, id: 'custom', label: 'Custom', [key]: value } })),
  setSeason: (season) =>
    set({ tripContext: { season, ...SEASON_DEFAULTS[season] } }),
  setTripContext: (key, value) =>
    set((s) => ({ tripContext: { ...s.tripContext, [key]: value } })),
  setRouteWeather: (weather) => set({ routeWeather: weather }),
  setIsLoadingWeather: (v) => set({ isLoadingWeather: v }),
  setShowWeatherMarkers: (v) => set({ showWeatherMarkers: v }),
  setUnifiedPlan: (plan) => set({ unifiedPlan: plan }),
  setIsPlanning: (v) => set({ isPlanning: v }),
  setActiveView: (v) => set({ activeView: v }),
  setWaterCapacityL: (v) => set({ waterCapacityL: Math.max(0.5, Math.min(5.0, v)) }),
  setWaterPlan: (p) => set({ waterPlan: p }),
}));
