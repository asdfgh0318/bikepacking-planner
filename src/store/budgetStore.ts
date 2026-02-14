import { create } from 'zustand';

export interface BudgetRates {
  foodPerDay: number;       // PLN per day
  campingPerNight: number;  // PLN per night (paid campsites)
  transportToStart: number; // PLN one-way transport
  emergencyFund: number;    // PLN flat
  paczkomatShippingPerParcel: number; // PLN per InPost shipment
}

interface BudgetState {
  rates: BudgetRates;
  setRate: <K extends keyof BudgetRates>(key: K, value: number) => void;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  rates: {
    foodPerDay: 60,
    campingPerNight: 30,
    transportToStart: 80,
    emergencyFund: 100,
    paczkomatShippingPerParcel: 15,
  },
  setRate: (key, value) =>
    set((s) => ({ rates: { ...s.rates, [key]: value } })),
}));
