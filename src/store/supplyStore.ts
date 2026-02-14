import { create } from 'zustand';
import type { SupplyPoint } from '../types';

interface SupplyState {
  supplyPoints: SupplyPoint[];
  corridorWidthKm: number;
  showPaczkomaty: boolean;
  showShops: boolean;
  isLoading: boolean;

  setSupplyPoints: (pts: SupplyPoint[]) => void;
  setCorridorWidthKm: (km: number) => void;
  setShowPaczkomaty: (v: boolean) => void;
  setShowShops: (v: boolean) => void;
  setIsLoading: (v: boolean) => void;
}

export const useSupplyStore = create<SupplyState>((set) => ({
  supplyPoints: [],
  corridorWidthKm: 2,
  showPaczkomaty: true,
  showShops: true,
  isLoading: false,

  setSupplyPoints: (pts) => set({ supplyPoints: pts }),
  setCorridorWidthKm: (km) => set({ corridorWidthKm: km }),
  setShowPaczkomaty: (v) => set({ showPaczkomaty: v }),
  setShowShops: (v) => set({ showShops: v }),
  setIsLoading: (v) => set({ isLoading: v }),
}));
