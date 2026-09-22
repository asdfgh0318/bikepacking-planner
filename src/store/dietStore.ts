import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DietType, SupplyOrder } from '../types';

interface DietState {
  selectedDiet: DietType;
  rideDays: number;
  orders: SupplyOrder[];
  isPlanning: boolean;

  setSelectedDiet: (d: DietType) => void;
  setRideDays: (d: number) => void;
  setOrders: (o: SupplyOrder[]) => void;
  setIsPlanning: (v: boolean) => void;
}

export const useDietStore = create<DietState>()(persist((set) => ({
  selectedDiet: 'standard',
  rideDays: 2,
  orders: [],
  isPlanning: false,

  setSelectedDiet: (d) => set({ selectedDiet: d }),
  setRideDays: (d) => set({ rideDays: d }),
  setOrders: (o) => set({ orders: o }),
  setIsPlanning: (v) => set({ isPlanning: v }),
}), {
  name: 'bikepacking-diet',
  partialize: (s) => ({ selectedDiet: s.selectedDiet, rideDays: s.rideDays }),
}));
