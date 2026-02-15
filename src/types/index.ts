export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
}

export type RoutingProfile = 'trekking' | 'fastbike' | 'mtb';

export interface RouteStats {
  distanceKm: number;
  ascentM: number;
  descentM: number;
}

// Gear & Weight
export interface GearItem {
  id: string;
  name: string;
  category: 'shelter' | 'sleep' | 'cooking' | 'clothing' | 'tools' | 'electronics' | 'other';
  weightG: number;
  packed: boolean;
}

export interface GearPreset {
  name: string;
  items: Omit<GearItem, 'id' | 'packed'>[];
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
  estimatedPricePLN?: number;
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
  type: 'paczkomat' | 'zabka' | 'biedronka' | 'shop' | 'water' | 'campsite' | 'repair' | 'train_station' | 'bus_stop' | 'hospital';
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

// Supply gap analysis
export type GapSeverity = 'safe' | 'caution' | 'danger';

export interface GapAlternative {
  name: string;
  type: string;
  lat: number;
  lng: number;
  detourKm: number; // round-trip detour distance
  routeKm: number;  // where on route the detour starts
}

export interface SupplyGap {
  startKm: number;
  endKm: number;
  distanceKm: number;
  severity: GapSeverity;
  fromName: string;
  toName: string;
  alternatives?: GapAlternative[];
  stockUpAt?: { name: string; km: number };
  nextResupply?: { name: string; km: number };
}

// Night stop suggestion
export interface NightStop {
  dayNumber: number;
  campsite: SupplyPoint | null;
  distanceFromStartKm: number;
  coord: [number, number];
  type: 'campsite' | 'wild';
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
  nightStop?: NightStop;
}

// Weather Forecast (Open-Meteo)
export type WeatherCondition =
  | 'clear' | 'partly_cloudy' | 'cloudy' | 'fog'
  | 'drizzle' | 'rain' | 'heavy_rain'
  | 'snow' | 'thunderstorm';

export interface DayWeather {
  dayNumber: number;
  date: string;                   // ISO date
  tempMin: number;                // °C
  tempMax: number;
  precipitationSum: number;       // mm total
  precipitationProbMax: number;   // 0-100 %
  windSpeedMax: number;           // km/h
  windDirection: number;          // degrees (0=N, 90=E, 180=S, 270=W)
  condition: WeatherCondition;
  weatherCode: number;            // WMO code
}

export interface RouteWeather {
  days: DayWeather[];
  fetchedAt: number;              // timestamp for cache
  sampleCoord: [number, number];  // representative coordinate used
  forecastAvailable: boolean;     // false when trip is >16 days out (Open-Meteo limit)
}

// Resupply Strategy
export type ResupplyStrategyId = 'auto' | 'daily-ration' | 'grazer' | 'ultralight' | 'self-sufficient' | 'custom';

export interface ResupplyStrategy {
  id: ResupplyStrategyId;
  label: string;
  description: string;
  maxStopsPerDay: number;       // 1 = daily ration, 3+ = graze
  preferEarlyStop: boolean;     // pick up food early in the day
  carryBufferDays: number;      // extra days of food to carry (0 = just today, 1 = tomorrow too)
  minCalorieReserve: number;    // minimum kcal reserve before buying (0 = buy every stop)
  preferStoreType: string[];    // store preference order
}

// Trip Context — season/weather adjustments
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface TripContext {
  season: Season;
  daylightHours: number;       // available riding hours (daylight - 2h buffer)
  waterMultiplier: number;     // 1.0 = normal, 1.5 = hot summer
  extraGearWeightG: number;    // additional clothing/insulation weight
}

// Smart Resupply Pipeline
export interface StopPurchase {
  stopId: string;
  stopName: string;
  stopType: SupplyPoint['type'];
  distanceKm: number;
  dayNumber: number;
  estimatedArrivalHour: number;
  isOpenOnArrival: boolean | null;
  items: FoodItem[];
  totalCalories: number;
  totalWeightG: number;
  source: 'shop' | 'paczkomat';
}

export interface CarryWeightPoint {
  distanceKm: number;
  dayNumber: number;
  foodWeightG: number;
}

export interface ResupplyWarning {
  type: 'closed_store' | 'long_carry' | 'calorie_deficit' | 'heavy_load' | 'sunday_closed';
  message: string;
  dayNumber: number;
  distanceKm: number;
  severity: 'info' | 'warning' | 'danger';
}

export interface ResupplyPlan {
  purchases: StopPurchase[];
  carryWeightCurve: CarryWeightPoint[];
  maxCarryWeightG: number;
  totalCalories: number;
  totalWeightG: number;
  warnings: ResupplyWarning[];
}

// Paczkomat Pre-Shipping
export interface PaczkomatParcel {
  id: string;
  targetPaczkomat: SupplyPoint;
  dayNumber: number;
  estimatedPickupDate: string;
  shipByDate: string;
  items: FoodItem[];
  totalWeightG: number;
  totalCalories: number;
  lockerSize: 'A' | 'B' | 'C';
}

export interface PaczkomatConfig {
  intervalDays: number;
  prefer24h: boolean;
  preferNearNightStop: boolean;
  tripStartDate: string;
  leadTimeDays: number;
}

export interface ShippingPlan {
  parcels: PaczkomatParcel[];
  totalParcels: number;
  totalShippingWeightG: number;
}

// Unified Shopping Plan
export interface DayShoppingBreakdown {
  dayNumber: number;
  distanceKm: number;
  caloriesNeeded: number;
  caloriesFromParcels: number;
  caloriesFromShops: number;
  carryWeightStartG: number;
  carryWeightMaxG: number;
  stops: StopPurchase[];
  parcelPickup: PaczkomatParcel | null;
}

export interface UnifiedShoppingPlan {
  resupply: ResupplyPlan;
  shipping: ShippingPlan | null;
  dayBreakdown: DayShoppingBreakdown[];
}

// Water consumption planning (re-exported from waterPlanner service)
export type { WaterPlan, WaterLevelPoint, WaterCriticalPoint } from '../services/waterPlanner';
