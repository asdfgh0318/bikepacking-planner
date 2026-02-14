import { create } from 'zustand';
import type { GearItem } from '../types';

const DEFAULT_GEAR: Omit<GearItem, 'id'>[] = [
  { name: 'Tent / Bivy', category: 'shelter', weightG: 1200, packed: true },
  { name: 'Sleeping bag', category: 'sleep', weightG: 900, packed: true },
  { name: 'Sleeping pad', category: 'sleep', weightG: 450, packed: true },
  { name: 'Stove + fuel', category: 'cooking', weightG: 350, packed: true },
  { name: 'Pot & utensils', category: 'cooking', weightG: 300, packed: true },
  { name: 'Rain jacket', category: 'clothing', weightG: 250, packed: true },
  { name: 'Warm layer', category: 'clothing', weightG: 400, packed: true },
  { name: 'Spare clothes', category: 'clothing', weightG: 500, packed: true },
  { name: 'Multi-tool', category: 'tools', weightG: 150, packed: true },
  { name: 'Spare tube + patches', category: 'tools', weightG: 200, packed: true },
  { name: 'Mini pump', category: 'tools', weightG: 120, packed: true },
  { name: 'Phone + charger', category: 'electronics', weightG: 250, packed: true },
  { name: 'Power bank', category: 'electronics', weightG: 300, packed: true },
  { name: 'Headlamp', category: 'electronics', weightG: 80, packed: true },
  { name: 'First aid kit', category: 'other', weightG: 200, packed: true },
  { name: 'Water bottles (2L)', category: 'other', weightG: 2100, packed: true },
  { name: 'Lock', category: 'tools', weightG: 300, packed: true },
];

let gearNextId = 1;

interface GearState {
  items: GearItem[];
  bikeWeightKg: number;

  toggleItem: (id: string) => void;
  addItem: (name: string, category: GearItem['category'], weightG: number) => void;
  removeItem: (id: string) => void;
  updateItemWeight: (id: string, weightG: number) => void;
  setBikeWeightKg: (kg: number) => void;
}

export const useGearStore = create<GearState>((set) => ({
  items: DEFAULT_GEAR.map((g) => ({ ...g, id: String(gearNextId++) })),
  bikeWeightKg: 12,

  toggleItem: (id) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, packed: !i.packed } : i)),
    })),

  addItem: (name, category, weightG) =>
    set((s) => ({
      items: [...s.items, { id: String(gearNextId++), name, category, weightG, packed: true }],
    })),

  removeItem: (id) =>
    set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  updateItemWeight: (id, weightG) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, weightG } : i)),
    })),

  setBikeWeightKg: (kg) => set({ bikeWeightKg: kg }),
}));
