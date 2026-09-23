import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DietType, ResupplyStrategyId, RouteWeather, UnifiedShoppingPlan } from '../types';
import type { WaterPlan } from '../services/waterPlanner';
import { todayLocal } from '../utils/date';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Everything about the trip that isn't the route line itself: when it
 * starts, how you ride, how you eat, plus the derived weather, water and
 * resupply plan. Settings persist; derived data is regenerated on load.
 */
interface TripState {
  tripStartDate: string;
  rideStartHour: number;
  avgSpeedKmh: number;
  strategyId: ResupplyStrategyId;
  diet: DietType;
  paczkomatShipping: boolean;
  waterCapacityL: number;

  routeWeather: RouteWeather | null;
  isLoadingWeather: boolean;
  waterPlan: WaterPlan | null;
  plan: UnifiedShoppingPlan | null;

  setTripStartDate: (d: string) => void;
  setRideStartHour: (h: number) => void;
  setAvgSpeedKmh: (v: number) => void;
  setStrategyId: (id: ResupplyStrategyId) => void;
  setDiet: (d: DietType) => void;
  setPaczkomatShipping: (v: boolean) => void;
  setWaterCapacityL: (v: number) => void;
  setRouteWeather: (w: RouteWeather | null) => void;
  setIsLoadingWeather: (v: boolean) => void;
  setWaterPlan: (p: WaterPlan | null) => void;
  setPlan: (p: UnifiedShoppingPlan | null) => void;
}

export const useTripStore = create<TripState>()(persist((set) => ({
  tripStartDate: todayLocal(),
  rideStartHour: 7,
  avgSpeedKmh: 15,
  strategyId: 'auto',
  diet: 'standard',
  paczkomatShipping: false,
  waterCapacityL: 2,

  routeWeather: null,
  isLoadingWeather: false,
  waterPlan: null,
  plan: null,

  setTripStartDate: (d) => {
    if (ISO_DATE.test(d) && !Number.isNaN(new Date(d).getTime())) set({ tripStartDate: d });
  },
  setRideStartHour: (h) => set({ rideStartHour: Math.max(4, Math.min(12, h)) }),
  setAvgSpeedKmh: (v) => set({ avgSpeedKmh: Math.max(8, Math.min(30, v)) }),
  setStrategyId: (id) => set({ strategyId: id }),
  setDiet: (d) => set({ diet: d }),
  setPaczkomatShipping: (v) => set({ paczkomatShipping: v }),
  setWaterCapacityL: (v) => set({ waterCapacityL: Math.max(0.5, Math.min(5, v)) }),
  setRouteWeather: (w) => set({ routeWeather: w }),
  setIsLoadingWeather: (v) => set({ isLoadingWeather: v }),
  setWaterPlan: (p) => set({ waterPlan: p }),
  setPlan: (p) => set({ plan: p }),
}), {
  name: 'bikepacking-trip',
  partialize: (s) => ({
    tripStartDate: s.tripStartDate,
    rideStartHour: s.rideStartHour,
    avgSpeedKmh: s.avgSpeedKmh,
    strategyId: s.strategyId,
    diet: s.diet,
    paczkomatShipping: s.paczkomatShipping,
    waterCapacityL: s.waterCapacityL,
  }),
}));
