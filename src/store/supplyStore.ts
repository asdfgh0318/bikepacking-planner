import { create } from 'zustand';
import type { SupplyPoint, SupplyGap } from '../types';

interface SupplyState {
  supplyPoints: SupplyPoint[];
  supplyGaps: SupplyGap[];
  waterGaps: SupplyGap[];
  corridorWidthKm: number;
  showPaczkomaty: boolean;
  showShops: boolean;
  showWater: boolean;
  showCampsites: boolean;
  showRepair: boolean;
  showBailOut: boolean;
  showFuel: boolean;
  showFood: boolean;
  showPharmacy: boolean;
  showToilets: boolean;
  showHalts: boolean;
  bailOutPoints: SupplyPoint[];
  isLoading: boolean;

  setSupplyPoints: (pts: SupplyPoint[]) => void;
  setSupplyGaps: (gaps: SupplyGap[]) => void;
  setWaterGaps: (gaps: SupplyGap[]) => void;
  setCorridorWidthKm: (km: number) => void;
  setShowPaczkomaty: (v: boolean) => void;
  setShowShops: (v: boolean) => void;
  setShowWater: (v: boolean) => void;
  setShowCampsites: (v: boolean) => void;
  setShowRepair: (v: boolean) => void;
  setShowBailOut: (v: boolean) => void;
  setShowFuel: (v: boolean) => void;
  setShowFood: (v: boolean) => void;
  setShowPharmacy: (v: boolean) => void;
  setShowToilets: (v: boolean) => void;
  setShowHalts: (v: boolean) => void;
  setBailOutPoints: (pts: SupplyPoint[]) => void;
  setIsLoading: (v: boolean) => void;
}

export const useSupplyStore = create<SupplyState>((set) => ({
  supplyPoints: [],
  supplyGaps: [],
  waterGaps: [],
  corridorWidthKm: 2,
  showPaczkomaty: true,
  showShops: true,
  showWater: true,
  showCampsites: true,
  showRepair: true,
  showBailOut: true,
  showFuel: true,
  showFood: false,
  showPharmacy: false,
  showToilets: false,
  showHalts: true,
  bailOutPoints: [],
  isLoading: false,

  setSupplyPoints: (pts) => set({ supplyPoints: pts }),
  setSupplyGaps: (gaps) => set({ supplyGaps: gaps }),
  setWaterGaps: (gaps) => set({ waterGaps: gaps }),
  setCorridorWidthKm: (km) => set({ corridorWidthKm: Math.max(0.5, Math.min(20, km)) }),
  setShowPaczkomaty: (v) => set({ showPaczkomaty: v }),
  setShowShops: (v) => set({ showShops: v }),
  setShowWater: (v) => set({ showWater: v }),
  setShowCampsites: (v) => set({ showCampsites: v }),
  setShowRepair: (v) => set({ showRepair: v }),
  setShowBailOut: (v) => set({ showBailOut: v }),
  setShowFuel: (v) => set({ showFuel: v }),
  setShowFood: (v) => set({ showFood: v }),
  setShowPharmacy: (v) => set({ showPharmacy: v }),
  setShowToilets: (v) => set({ showToilets: v }),
  setShowHalts: (v) => set({ showHalts: v }),
  setBailOutPoints: (pts) => set({ bailOutPoints: pts }),
  setIsLoading: (v) => set({ isLoading: v }),
}));
