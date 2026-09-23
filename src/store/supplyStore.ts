import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SupplyPoint, SupplyGap } from '../types';

/** Map layer groups a rider actually toggles. Each covers several OSM types. */
export type LayerGroup = 'food' | 'water' | 'sleep' | 'services' | 'bailout' | 'weather';

export const LAYER_TYPES: Record<Exclude<LayerGroup, 'weather'>, ReadonlySet<SupplyPoint['type']>> = {
  food: new Set(['zabka', 'biedronka', 'shop', 'supermarket', 'convenience', 'bakery', 'cafe', 'restaurant', 'fuel', 'paczkomat']),
  water: new Set(['water']),
  sleep: new Set(['campsite', 'alpine_hut', 'basic_shelter']),
  services: new Set(['repair', 'compressed_air', 'pharmacy', 'toilets']),
  bailout: new Set(['train_station', 'halt', 'bus_stop', 'hospital']),
};

export const LAYER_LABELS: Record<LayerGroup, string> = {
  food: 'Shops & food',
  water: 'Water',
  sleep: 'Campsites & shelters',
  services: 'Repair, pharmacy, toilets',
  bailout: 'Trains & hospitals',
  weather: 'Weather on map',
};

interface SupplyState {
  supplyPoints: SupplyPoint[];
  bailOutPoints: SupplyPoint[];
  supplyGaps: SupplyGap[];
  waterGaps: SupplyGap[];
  corridorWidthKm: number;
  layers: Record<LayerGroup, boolean>;
  isLoading: boolean;

  setSupplyPoints: (pts: SupplyPoint[]) => void;
  setBailOutPoints: (pts: SupplyPoint[]) => void;
  setSupplyGaps: (gaps: SupplyGap[]) => void;
  setWaterGaps: (gaps: SupplyGap[]) => void;
  setCorridorWidthKm: (km: number) => void;
  toggleLayer: (g: LayerGroup) => void;
  setIsLoading: (v: boolean) => void;
}

export const useSupplyStore = create<SupplyState>()(persist((set) => ({
  supplyPoints: [],
  bailOutPoints: [],
  supplyGaps: [],
  waterGaps: [],
  corridorWidthKm: 2,
  layers: { food: true, water: true, sleep: true, services: false, bailout: true, weather: true },
  isLoading: false,

  setSupplyPoints: (pts) => set({ supplyPoints: pts }),
  setBailOutPoints: (pts) => set({ bailOutPoints: pts }),
  setSupplyGaps: (gaps) => set({ supplyGaps: gaps }),
  setWaterGaps: (gaps) => set({ waterGaps: gaps }),
  setCorridorWidthKm: (km) => set({ corridorWidthKm: Math.max(0.5, Math.min(20, km)) }),
  toggleLayer: (g) => set((s) => ({ layers: { ...s.layers, [g]: !s.layers[g] } })),
  setIsLoading: (v) => set({ isLoading: v }),
}), {
  name: 'bikepacking-supply',
  partialize: (s) => ({ corridorWidthKm: s.corridorWidthKm, layers: s.layers }),
}));
