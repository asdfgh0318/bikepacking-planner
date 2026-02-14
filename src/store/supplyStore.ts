import { create } from 'zustand';
import type { SupplyPoint } from '../types';

interface SupplyState {
  supplyPoints: SupplyPoint[];
  corridorWidthKm: number;
  showPaczkomaty: boolean;
  showShops: boolean;
  showWater: boolean;
  showCampsites: boolean;
  showRepair: boolean;
  isLoading: boolean;

  setSupplyPoints: (pts: SupplyPoint[]) => void;
  setCorridorWidthKm: (km: number) => void;
  setShowPaczkomaty: (v: boolean) => void;
  setShowShops: (v: boolean) => void;
  setShowWater: (v: boolean) => void;
  setShowCampsites: (v: boolean) => void;
  setShowRepair: (v: boolean) => void;
  setIsLoading: (v: boolean) => void;
}

export const useSupplyStore = create<SupplyState>((set) => ({
  supplyPoints: [],
  corridorWidthKm: 2,
  showPaczkomaty: true,
  showShops: true,
  showWater: true,
  showCampsites: true,
  showRepair: true,
  isLoading: false,

  setSupplyPoints: (pts) => set({ supplyPoints: pts }),
  setCorridorWidthKm: (km) => set({ corridorWidthKm: km }),
  setShowPaczkomaty: (v) => set({ showPaczkomaty: v }),
  setShowShops: (v) => set({ showShops: v }),
  setShowWater: (v) => set({ showWater: v }),
  setShowCampsites: (v) => set({ showCampsites: v }),
  setShowRepair: (v) => set({ showRepair: v }),
  setIsLoading: (v) => set({ isLoading: v }),
}));
