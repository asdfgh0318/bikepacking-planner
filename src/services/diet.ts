import type { DietProfile, DietType, FoodItem, SupplyOrder, SupplyPoint, RouteStats } from '../types';

export const DIET_PROFILES: Record<DietType, DietProfile> = {
  standard: {
    type: 'standard',
    label: 'Standard',
    description: 'Balanced diet for moderate cycling',
    calsPerKm: 30,
    calsPerAscentM: 5,
    baseCalsPerDay: 2000,
    macros: { carbsPct: 55, fatPct: 25, proteinPct: 20 },
  },
  'high-energy': {
    type: 'high-energy',
    label: 'High Energy',
    description: 'Maximum calories for long hard days',
    calsPerKm: 35,
    calsPerAscentM: 6,
    baseCalsPerDay: 2200,
    macros: { carbsPct: 60, fatPct: 22, proteinPct: 18 },
  },
  ultralight: {
    type: 'ultralight',
    label: 'Ultralight',
    description: 'Minimal weight, calorie-dense foods',
    calsPerKm: 25,
    calsPerAscentM: 4,
    baseCalsPerDay: 1800,
    macros: { carbsPct: 50, fatPct: 30, proteinPct: 20 },
  },
  keto: {
    type: 'keto',
    label: 'Keto',
    description: 'High fat, low carb for fat-adapted riders',
    calsPerKm: 28,
    calsPerAscentM: 5,
    baseCalsPerDay: 2000,
    macros: { carbsPct: 10, fatPct: 70, proteinPct: 20 },
  },
  vegan: {
    type: 'vegan',
    label: 'Vegan',
    description: 'Plant-based fueling',
    calsPerKm: 30,
    calsPerAscentM: 5,
    baseCalsPerDay: 2000,
    macros: { carbsPct: 55, fatPct: 25, proteinPct: 20 },
  },
};

// Food database — items commonly available in Polish stores/Paczkomaty
const FOOD_DB: Record<DietType, FoodItem[]> = {
  standard: [
    { name: 'Owsianka instant', calories: 380, weightG: 100, category: 'meal', availableAt: ['zabka', 'biedronka', 'shop'] },
    { name: 'Makaron z sosem (packet)', calories: 520, weightG: 150, category: 'meal', availableAt: ['zabka', 'biedronka', 'shop'] },
    { name: 'Chleb tostowy + masło orzechowe', calories: 600, weightG: 200, category: 'meal', availableAt: ['zabka', 'biedronka', 'shop'] },
    { name: 'Baton energetyczny', calories: 250, weightG: 60, category: 'snack', availableAt: ['zabka', 'biedronka', 'paczkomat', 'shop'] },
    { name: 'Mieszanka studencka', calories: 500, weightG: 100, category: 'snack', availableAt: ['zabka', 'biedronka', 'shop'] },
    { name: 'Banan (3x)', calories: 300, weightG: 360, category: 'snack', availableAt: ['zabka', 'biedronka', 'shop'] },
    { name: 'Izotonik (proszek)', calories: 120, weightG: 40, category: 'drink', availableAt: ['zabka', 'paczkomat', 'shop'] },
    { name: 'Woda 1.5L', calories: 0, weightG: 1500, category: 'drink', availableAt: ['zabka', 'biedronka', 'shop'] },
    { name: 'Elektrolity (saszetki x3)', calories: 30, weightG: 30, category: 'supplement', availableAt: ['paczkomat', 'shop'] },
  ],
  'high-energy': [
    { name: 'Owsianka z orzechami', calories: 500, weightG: 120, category: 'meal', availableAt: ['zabka', 'biedronka', 'shop'] },
    { name: 'Wrap z kurczakiem', calories: 550, weightG: 200, category: 'meal', availableAt: ['zabka', 'shop'] },
    { name: 'Risotto instant', calories: 600, weightG: 160, category: 'meal', availableAt: ['paczkomat', 'shop'] },
    { name: 'Żel energetyczny (x3)', calories: 300, weightG: 120, category: 'snack', availableAt: ['paczkomat', 'zabka', 'shop'] },
    { name: 'Baton proteinowy', calories: 350, weightG: 80, category: 'snack', availableAt: ['zabka', 'biedronka', 'paczkomat', 'shop'] },
    { name: 'Czekolada gorzka 100g', calories: 550, weightG: 100, category: 'snack', availableAt: ['zabka', 'biedronka', 'shop'] },
    { name: 'Izotonik (proszek)', calories: 120, weightG: 40, category: 'drink', availableAt: ['zabka', 'paczkomat', 'shop'] },
    { name: 'Napój energetyczny', calories: 120, weightG: 330, category: 'drink', availableAt: ['zabka', 'biedronka', 'shop'] },
    { name: 'Magnez + Elektrolity', calories: 30, weightG: 30, category: 'supplement', availableAt: ['paczkomat', 'shop'] },
  ],
  ultralight: [
    { name: 'Liofilizat - obiad', calories: 500, weightG: 80, category: 'meal', availableAt: ['paczkomat', 'shop'] },
    { name: 'Liofilizat - śniadanie', calories: 400, weightG: 70, category: 'meal', availableAt: ['paczkomat', 'shop'] },
    { name: 'Masło orzechowe (saszetka)', calories: 300, weightG: 50, category: 'snack', availableAt: ['paczkomat', 'zabka', 'shop'] },
    { name: 'Orzechy macadamia 50g', calories: 360, weightG: 50, category: 'snack', availableAt: ['paczkomat', 'shop'] },
    { name: 'Żel energetyczny (x2)', calories: 200, weightG: 80, category: 'snack', availableAt: ['paczkomat', 'zabka', 'shop'] },
    { name: 'Elektrolity (tabletki)', calories: 20, weightG: 20, category: 'supplement', availableAt: ['paczkomat', 'shop'] },
  ],
  keto: [
    { name: 'Salami / kabanosy 200g', calories: 500, weightG: 200, category: 'meal', availableAt: ['zabka', 'biedronka', 'shop'] },
    { name: 'Ser żółty 200g', calories: 700, weightG: 200, category: 'meal', availableAt: ['zabka', 'biedronka', 'shop'] },
    { name: 'Orzechy pekan 100g', calories: 690, weightG: 100, category: 'snack', availableAt: ['paczkomat', 'biedronka', 'shop'] },
    { name: 'Oliwki (słoik)', calories: 200, weightG: 200, category: 'snack', availableAt: ['zabka', 'biedronka', 'shop'] },
    { name: 'Masło orzechowe', calories: 600, weightG: 100, category: 'snack', availableAt: ['zabka', 'biedronka', 'paczkomat', 'shop'] },
    { name: 'Awokado (2x)', calories: 400, weightG: 400, category: 'meal', availableAt: ['biedronka', 'shop'] },
    { name: 'Elektrolity (saszetki x3)', calories: 30, weightG: 30, category: 'supplement', availableAt: ['paczkomat', 'shop'] },
  ],
  vegan: [
    { name: 'Owsianka z nasionami chia', calories: 400, weightG: 100, category: 'meal', availableAt: ['zabka', 'biedronka', 'shop'] },
    { name: 'Hummus + pieczywo', calories: 450, weightG: 200, category: 'meal', availableAt: ['zabka', 'biedronka', 'shop'] },
    { name: 'Kuskus z warzywami (instant)', calories: 480, weightG: 130, category: 'meal', availableAt: ['paczkomat', 'shop'] },
    { name: 'Mieszanka orzechów i daktyli', calories: 500, weightG: 100, category: 'snack', availableAt: ['zabka', 'biedronka', 'paczkomat', 'shop'] },
    { name: 'Baton daktylowy', calories: 220, weightG: 50, category: 'snack', availableAt: ['zabka', 'biedronka', 'shop'] },
    { name: 'Masło orzechowe (saszetka)', calories: 300, weightG: 50, category: 'snack', availableAt: ['paczkomat', 'zabka', 'shop'] },
    { name: 'Mleko owsiane 0.5L', calories: 200, weightG: 500, category: 'drink', availableAt: ['zabka', 'biedronka', 'shop'] },
    { name: 'Elektrolity vegan', calories: 20, weightG: 20, category: 'supplement', availableAt: ['paczkomat', 'shop'] },
  ],
};

export function calculateDailyCalories(
  profile: DietProfile,
  dailyDistanceKm: number,
  dailyAscentM: number
): number {
  return Math.round(
    profile.baseCalsPerDay +
    profile.calsPerKm * dailyDistanceKm +
    profile.calsPerAscentM * dailyAscentM
  );
}

export function generateSupplyOrders(
  profile: DietProfile,
  routeStats: RouteStats,
  supplyPoints: SupplyPoint[],
  rideDays: number
): SupplyOrder[] {
  if (supplyPoints.length === 0 || rideDays < 1) return [];

  const dailyDistKm = routeStats.distanceKm / rideDays;
  const dailyAscent = routeStats.ascentM / rideDays;
  const dailyCals = calculateDailyCalories(profile, dailyDistKm, dailyAscent);

  const foods = FOOD_DB[profile.type] || FOOD_DB.standard;

  // Assign each supply point to a day
  const orders: SupplyOrder[] = [];

  // Pick supply stops: roughly one per day, preferring Paczkomaty for shipped items
  const kmPerDay = routeStats.distanceKm / rideDays;
  const selectedStops: Array<{ point: SupplyPoint; day: number }> = [];

  for (let day = 0; day < rideDays; day++) {
    const dayStartKm = day * kmPerDay;
    const dayMidKm = dayStartKm + kmPerDay * 0.6; // pick up at 60% of the day

    // Find closest supply point to the mid-day point
    let best: SupplyPoint | null = null;
    let bestDist = Infinity;

    for (const sp of supplyPoints) {
      const dist = Math.abs(sp.distanceFromStartKm - dayMidKm);
      // Don't reuse a stop already picked
      if (dist < bestDist && !selectedStops.some((s) => s.point.id === sp.id)) {
        best = sp;
        bestDist = dist;
      }
    }

    if (best) {
      selectedStops.push({ point: best, day: day + 1 });
    }
  }

  // Generate food lists for each stop
  for (const { point, day } of selectedStops) {
    const items: FoodItem[] = [];
    let totalCals = 0;

    // Fill until we hit daily calorie target
    // Prioritize items available at this stop type
    const sortedFoods = [...foods].sort((a, b) => {
      const aAvail = a.availableAt.includes(point.type) ? 0 : 1;
      const bAvail = b.availableAt.includes(point.type) ? 0 : 1;
      return aAvail - bAvail;
    });

    for (const food of sortedFoods) {
      if (totalCals >= dailyCals) break;
      items.push(food);
      totalCals += food.calories;
    }

    // If still short, add more snacks
    while (totalCals < dailyCals * 0.9) {
      const snacks = sortedFoods.filter((f) => f.category === 'snack');
      if (snacks.length === 0) break;
      const snack = snacks[items.length % snacks.length];
      items.push(snack);
      totalCals += snack.calories;
    }

    orders.push({
      stopId: point.id,
      stopName: point.name,
      distanceKm: point.distanceFromStartKm,
      dayNumber: day,
      items,
      totalCalories: totalCals,
      totalWeightG: items.reduce((sum, f) => sum + f.weightG, 0),
    });
  }

  return orders;
}
