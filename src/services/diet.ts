import type { DietProfile, DietType, FoodItem, SupplyOrder, SupplyPoint, RouteStats } from '../types';

// Calorie coefficients calibrated against bikepacking research:
// 80km flat day → ~3760 cal, 80km+800m ascent → ~6560 cal
// Source: bikepacking.com, Ride Far, Adventure Cycling Association
export const DIET_PROFILES: Record<DietType, DietProfile> = {
  standard: {
    type: 'standard',
    label: 'Standard',
    description: 'Balanced diet for moderate cycling',
    calsPerKm: 22,
    calsPerAscentM: 3.5,
    baseCalsPerDay: 2000,
    macros: { carbsPct: 55, fatPct: 25, proteinPct: 20 },
  },
  'high-energy': {
    type: 'high-energy',
    label: 'High Energy',
    description: 'Maximum calories for long hard days',
    calsPerKm: 26,
    calsPerAscentM: 4,
    baseCalsPerDay: 2200,
    macros: { carbsPct: 60, fatPct: 22, proteinPct: 18 },
  },
  ultralight: {
    type: 'ultralight',
    label: 'Ultralight',
    description: 'Minimal weight, calorie-dense foods',
    calsPerKm: 18,
    calsPerAscentM: 3,
    baseCalsPerDay: 1800,
    macros: { carbsPct: 50, fatPct: 30, proteinPct: 20 },
  },
  keto: {
    type: 'keto',
    label: 'Keto',
    description: 'High fat, low carb for fat-adapted riders',
    calsPerKm: 22,
    calsPerAscentM: 3.5,
    baseCalsPerDay: 2000,
    macros: { carbsPct: 10, fatPct: 70, proteinPct: 20 },
  },
  vegan: {
    type: 'vegan',
    label: 'Vegan',
    description: 'Plant-based fueling',
    calsPerKm: 22,
    calsPerAscentM: 3.5,
    baseCalsPerDay: 2000,
    macros: { carbsPct: 55, fatPct: 25, proteinPct: 20 },
  },
};

// Food database — calorie-dense items commonly available in Polish stores/Paczkomaty
// Target: 4-5 cal/gram average. Source: bikepacking.com trail food research
export const FOOD_DB: Record<DietType, FoodItem[]> = {
  standard: [
    // Meals (~3-4 cal/g)
    { name: 'Owsianka instant', calories: 380, weightG: 100, category: 'meal', availableAt: ['zabka', 'biedronka', 'shop'], estimatedPricePLN: 4 },
    { name: 'Tortilla + masło orzechowe', calories: 650, weightG: 150, category: 'meal', availableAt: ['zabka', 'biedronka', 'shop'], estimatedPricePLN: 10 },
    { name: 'Kuskus instant + oliwa', calories: 520, weightG: 130, category: 'meal', availableAt: ['zabka', 'biedronka', 'shop'], estimatedPricePLN: 6 },
    { name: 'Kabanosy 100g', calories: 450, weightG: 100, category: 'meal', availableAt: ['zabka', 'biedronka', 'shop'], estimatedPricePLN: 8 },
    // Snacks (4-7 cal/g — calorie dense)
    { name: 'Mieszanka studencka 100g', calories: 550, weightG: 100, category: 'snack', availableAt: ['zabka', 'biedronka', 'shop'], estimatedPricePLN: 8 },
    { name: 'Czekolada gorzka 100g', calories: 598, weightG: 100, category: 'snack', availableAt: ['zabka', 'biedronka', 'shop', 'paczkomat'], estimatedPricePLN: 5 },
    { name: 'Baton energetyczny', calories: 250, weightG: 60, category: 'snack', availableAt: ['zabka', 'biedronka', 'paczkomat', 'shop'], estimatedPricePLN: 5 },
    { name: 'Masło orzechowe 100g', calories: 588, weightG: 100, category: 'snack', availableAt: ['zabka', 'biedronka', 'paczkomat', 'shop'], estimatedPricePLN: 6 },
    { name: 'Migdały 80g', calories: 463, weightG: 80, category: 'snack', availableAt: ['zabka', 'biedronka', 'shop', 'paczkomat'], estimatedPricePLN: 8 },
    // Drinks & supplements
    { name: 'Izotonik (proszek)', calories: 120, weightG: 40, category: 'drink', availableAt: ['zabka', 'paczkomat', 'shop'], estimatedPricePLN: 4 },
    { name: 'Elektrolity (saszetki x3)', calories: 30, weightG: 30, category: 'supplement', availableAt: ['paczkomat', 'shop'], estimatedPricePLN: 8 },
  ],
  'high-energy': [
    { name: 'Owsianka z orzechami', calories: 500, weightG: 120, category: 'meal', availableAt: ['zabka', 'biedronka', 'shop'], estimatedPricePLN: 6 },
    { name: 'Tortilla + ser + salami', calories: 700, weightG: 180, category: 'meal', availableAt: ['zabka', 'biedronka', 'shop'], estimatedPricePLN: 12 },
    { name: 'Risotto instant', calories: 600, weightG: 160, category: 'meal', availableAt: ['paczkomat', 'shop'], estimatedPricePLN: 15 },
    { name: 'Żel energetyczny (x3)', calories: 300, weightG: 120, category: 'snack', availableAt: ['paczkomat', 'zabka', 'shop'], estimatedPricePLN: 12 },
    { name: 'Orzechy włoskie 100g', calories: 654, weightG: 100, category: 'snack', availableAt: ['zabka', 'biedronka', 'shop', 'paczkomat'], estimatedPricePLN: 10 },
    { name: 'Czekolada gorzka 100g', calories: 598, weightG: 100, category: 'snack', availableAt: ['zabka', 'biedronka', 'shop', 'paczkomat'], estimatedPricePLN: 5 },
    { name: 'Masło orzechowe 100g', calories: 588, weightG: 100, category: 'snack', availableAt: ['zabka', 'biedronka', 'paczkomat', 'shop'], estimatedPricePLN: 6 },
    { name: 'Baton proteinowy', calories: 350, weightG: 80, category: 'snack', availableAt: ['zabka', 'biedronka', 'paczkomat', 'shop'], estimatedPricePLN: 6 },
    { name: 'Izotonik (proszek)', calories: 120, weightG: 40, category: 'drink', availableAt: ['zabka', 'paczkomat', 'shop'], estimatedPricePLN: 4 },
    { name: 'Magnez + Elektrolity', calories: 30, weightG: 30, category: 'supplement', availableAt: ['paczkomat', 'shop'], estimatedPricePLN: 10 },
  ],
  ultralight: [
    { name: 'Liofilizat - obiad', calories: 500, weightG: 80, category: 'meal', availableAt: ['paczkomat', 'shop'], estimatedPricePLN: 25 },
    { name: 'Liofilizat - śniadanie', calories: 400, weightG: 70, category: 'meal', availableAt: ['paczkomat', 'shop'], estimatedPricePLN: 20 },
    { name: 'Orzechy macadamia 50g', calories: 360, weightG: 50, category: 'snack', availableAt: ['paczkomat', 'shop'], estimatedPricePLN: 12 },
    { name: 'Masło orzechowe (saszetka)', calories: 300, weightG: 50, category: 'snack', availableAt: ['paczkomat', 'zabka', 'shop'], estimatedPricePLN: 4 },
    { name: 'Oliwa z oliwek 50ml', calories: 440, weightG: 50, category: 'snack', availableAt: ['biedronka', 'shop', 'paczkomat'], estimatedPricePLN: 3 },
    { name: 'Żel energetyczny (x2)', calories: 200, weightG: 80, category: 'snack', availableAt: ['paczkomat', 'zabka', 'shop'], estimatedPricePLN: 8 },
    { name: 'Mleko w proszku 50g', calories: 248, weightG: 50, category: 'snack', availableAt: ['biedronka', 'paczkomat', 'shop'], estimatedPricePLN: 3 },
    { name: 'Elektrolity (tabletki)', calories: 20, weightG: 20, category: 'supplement', availableAt: ['paczkomat', 'shop'], estimatedPricePLN: 15 },
  ],
  keto: [
    { name: 'Kabanosy 200g', calories: 900, weightG: 200, category: 'meal', availableAt: ['zabka', 'biedronka', 'shop'], estimatedPricePLN: 10 },
    { name: 'Ser żółty 150g', calories: 525, weightG: 150, category: 'meal', availableAt: ['zabka', 'biedronka', 'shop'], estimatedPricePLN: 8 },
    { name: 'Tortilla + ser + salami', calories: 650, weightG: 160, category: 'meal', availableAt: ['zabka', 'biedronka', 'shop'], estimatedPricePLN: 12 },
    { name: 'Orzechy pekan 100g', calories: 691, weightG: 100, category: 'snack', availableAt: ['paczkomat', 'biedronka', 'shop'], estimatedPricePLN: 15 },
    { name: 'Masło orzechowe 100g', calories: 588, weightG: 100, category: 'snack', availableAt: ['zabka', 'biedronka', 'paczkomat', 'shop'], estimatedPricePLN: 10 },
    { name: 'Oliwa z oliwek 50ml', calories: 440, weightG: 50, category: 'snack', availableAt: ['biedronka', 'shop', 'paczkomat'], estimatedPricePLN: 3 },
    { name: 'Oliwki (słoik)', calories: 200, weightG: 200, category: 'snack', availableAt: ['zabka', 'biedronka', 'shop'], estimatedPricePLN: 7 },
    { name: 'Elektrolity (saszetki x3)', calories: 30, weightG: 30, category: 'supplement', availableAt: ['paczkomat', 'shop'], estimatedPricePLN: 8 },
  ],
  vegan: [
    { name: 'Owsianka z nasionami chia', calories: 400, weightG: 100, category: 'meal', availableAt: ['zabka', 'biedronka', 'shop'], estimatedPricePLN: 5 },
    { name: 'Hummus + tortilla', calories: 520, weightG: 180, category: 'meal', availableAt: ['zabka', 'biedronka', 'shop'], estimatedPricePLN: 10 },
    { name: 'Kuskus z warzywami (instant)', calories: 480, weightG: 130, category: 'meal', availableAt: ['paczkomat', 'shop'], estimatedPricePLN: 8 },
    { name: 'Mieszanka orzechów i daktyli', calories: 500, weightG: 100, category: 'snack', availableAt: ['zabka', 'biedronka', 'paczkomat', 'shop'], estimatedPricePLN: 10 },
    { name: 'Masło orzechowe 100g', calories: 588, weightG: 100, category: 'snack', availableAt: ['paczkomat', 'zabka', 'biedronka', 'shop'], estimatedPricePLN: 6 },
    { name: 'Baton daktylowy', calories: 220, weightG: 50, category: 'snack', availableAt: ['zabka', 'biedronka', 'shop'], estimatedPricePLN: 4 },
    { name: 'Pestki słonecznika 80g', calories: 467, weightG: 80, category: 'snack', availableAt: ['zabka', 'biedronka', 'shop', 'paczkomat'], estimatedPricePLN: 4 },
    { name: 'Izotonik (proszek)', calories: 120, weightG: 40, category: 'drink', availableAt: ['zabka', 'paczkomat', 'shop'], estimatedPricePLN: 4 },
    { name: 'Elektrolity vegan', calories: 20, weightG: 20, category: 'supplement', availableAt: ['paczkomat', 'shop'], estimatedPricePLN: 12 },
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
      const shopType = point.type as FoodItem['availableAt'][number];
      const aAvail = a.availableAt.includes(shopType) ? 0 : 1;
      const bAvail = b.availableAt.includes(shopType) ? 0 : 1;
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
