export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
}

export interface RouteStats {
  distanceKm: number;
  ascentM: number;
  descentM: number;
}

// Diet & Supply Planning
export type DietType = 'standard' | 'high-energy' | 'ultralight' | 'keto' | 'vegan';

export interface DietProfile {
  type: DietType;
  label: string;
  description: string;
  calsPerKm: number;      // extra calories burned per km cycling
  calsPerAscentM: number;  // extra calories per meter of ascent
  baseCalsPerDay: number;  // base metabolic rate
  macros: { carbsPct: number; fatPct: number; proteinPct: number };
}

export interface FoodItem {
  name: string;
  calories: number;
  weightG: number;
  category: 'meal' | 'snack' | 'drink' | 'supplement';
  availableAt: ('paczkomat' | 'zabka' | 'biedronka' | 'shop')[];
}

export interface SupplyOrder {
  stopId: string;
  stopName: string;
  distanceKm: number;
  dayNumber: number;
  items: FoodItem[];
  totalCalories: number;
  totalWeightG: number;
}

export interface SupplyPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'paczkomat' | 'zabka' | 'biedronka' | 'shop' | 'water' | 'campsite' | 'repair';
  distanceFromStartKm: number;
  details?: {
    address?: string;
    openingHours?: string;
    is24h?: boolean;
    lockerSize?: string[];
    waterType?: 'spring' | 'drinking_water' | 'fountain' | 'tap' | 'stream';
    campsiteType?: 'camp_site' | 'shelter' | 'wilderness_hut' | 'bivouac';
    capacity?: string;
    fee?: boolean;
    repairType?: 'shop' | 'repair_station';
    phone?: string;
  };
}

// Day Splitting
export type Difficulty = 'easy' | 'moderate' | 'hard';

export interface DaySegment {
  dayNumber: number;
  startKm: number;
  endKm: number;
  distanceKm: number;
  ascentM: number;
  descentM: number;
  startCoord: [number, number]; // [lng, lat]
  endCoord: [number, number];
  supplyStops: SupplyPoint[];
  estimatedHours: number;
  difficulty: Difficulty;
}
