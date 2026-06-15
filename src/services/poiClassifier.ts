import type { SupplyPoint } from '../types';

/** Raw element from Overpass API JSON response */
export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Polish retail chain wikidata IDs → app type + display name.
 *
 * `closedOnNonTradingSunday` marks chains subject to the Sunday
 * trading ban (ustawa o ograniczeniu handlu w niedziele). Per 2026
 * industry coverage, the dominant corporate large-format chains
 * (Biedronka, Lidl, Aldi, Auchan, Kaufland, Carrefour, Dino, Netto,
 * Intermarché, Stokrotka, Polomarket) are all closed on non-trading
 * Sundays. Franchise/owner-operated chains (Żabka, Lewiatan) stay
 * open via the franchise exemption — Lewiatan also runs many DHL
 * Parcel pickup points which exempts those locations under the
 * postal-services carve-out.
 */
const BRAND_REGISTRY: Record<string, {
  type: SupplyPoint['type'];
  name: string;
  closedOnNonTradingSunday?: boolean;
}> = {
  'Q2874810': { type: 'zabka', name: 'Żabka' },
  'Q857855': { type: 'biedronka', name: 'Biedronka', closedOnNonTradingSunday: true },
  'Q111': { type: 'supermarket', name: 'Lidl', closedOnNonTradingSunday: true },
  'Q685967': { type: 'supermarket', name: 'Auchan', closedOnNonTradingSunday: true },
  'Q487494': { type: 'supermarket', name: 'Kaufland', closedOnNonTradingSunday: true },
  'Q2462707': { type: 'supermarket', name: 'Dino', closedOnNonTradingSunday: true },
  'Q11790298': { type: 'supermarket', name: 'Netto', closedOnNonTradingSunday: true },
  'Q1543186': { type: 'supermarket', name: 'Lewiatan' }, // franchise — exempt
  'Q11790849': { type: 'supermarket', name: 'Stokrotka', closedOnNonTradingSunday: true },
  'Q11821937': { type: 'supermarket', name: 'Polomarket', closedOnNonTradingSunday: true },
  'Q7899': { type: 'supermarket', name: 'Carrefour', closedOnNonTradingSunday: true },
  'Q110079': { type: 'supermarket', name: 'Lidl', closedOnNonTradingSunday: true }, // alternate wikidata ID
  'Q152096': { type: 'supermarket', name: 'Aldi', closedOnNonTradingSunday: true },
  'Q316004': { type: 'supermarket', name: 'Intermarché', closedOnNonTradingSunday: true },
};

/**
 * Classification rule: a match predicate + a classify function.
 * Rules are checked in order — first match wins.
 */
interface ClassificationRule {
  match: (tags: Record<string, string>) => boolean;
  classify: (tags: Record<string, string>, el: OverpassElement) => {
    type: SupplyPoint['type'];
    name: string;
    details: SupplyPoint['details'];
  };
}

/** Extract common detail fields from OSM tags */
function extractCommonDetails(tags: Record<string, string>): Partial<NonNullable<SupplyPoint['details']>> {
  return {
    address: [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']].filter(Boolean).join(' ') || undefined,
    openingHours: tags.opening_hours || undefined,
    is24h: tags.opening_hours === '24/7' || undefined,
    phone: tags.phone || tags['contact:phone'] || undefined,
    website: tags.website || tags['contact:website'] || undefined,
    operator: tags.operator || undefined,
    brand: tags.brand || undefined,
  };
}

const RULES: ClassificationRule[] = [
  // === BRAND-SPECIFIC SHOPS (highest priority) ===
  {
    match: (tags) => !!tags['brand:wikidata'] && !!BRAND_REGISTRY[tags['brand:wikidata']],
    classify: (tags) => {
      const brand = BRAND_REGISTRY[tags['brand:wikidata']];
      return {
        type: brand.type,
        name: tags.name || brand.name,
        details: {
          ...extractCommonDetails(tags),
          brand: brand.name,
          ...(brand.closedOnNonTradingSunday && { closedOnNonTradingSunday: true }),
        },
      };
    },
  },

  // === SHOPS ===
  {
    match: (tags) => tags.shop === 'supermarket',
    classify: (tags) => ({
      type: 'supermarket',
      name: tags.name || tags.brand || 'Supermarket',
      details: { ...extractCommonDetails(tags), brand: tags.brand },
    }),
  },
  {
    match: (tags) => tags.shop === 'convenience',
    classify: (tags) => ({
      type: 'convenience',
      name: tags.name || tags.brand || 'Convenience Store',
      details: { ...extractCommonDetails(tags), brand: tags.brand },
    }),
  },
  {
    match: (tags) => tags.shop === 'bakery',
    classify: (tags) => ({
      type: 'bakery',
      name: tags.name || 'Bakery',
      details: extractCommonDetails(tags),
    }),
  },

  // === FOOD SERVICE ===
  {
    match: (tags) => tags.amenity === 'cafe',
    classify: (tags) => ({
      type: 'cafe',
      name: tags.name || 'Cafe',
      details: extractCommonDetails(tags),
    }),
  },
  {
    match: (tags) => tags.amenity === 'restaurant',
    classify: (tags) => ({
      type: 'restaurant',
      name: tags.name || 'Restaurant',
      details: extractCommonDetails(tags),
    }),
  },
  {
    match: (tags) => tags.amenity === 'fuel',
    classify: (tags) => ({
      type: 'fuel',
      name: tags.name || tags.brand || 'Fuel Station',
      details: {
        ...extractCommonDetails(tags),
        brand: tags.brand,
        hasToilet: tags.toilets === 'yes' || undefined,
        hasWater: tags.drinking_water === 'yes' || undefined,
      },
    }),
  },

  // === WATER ===
  {
    match: (tags) => tags.natural === 'spring',
    classify: (tags) => ({
      type: 'water',
      name: tags.name || 'Spring',
      details: { ...extractCommonDetails(tags), waterType: 'spring' as const },
    }),
  },
  {
    match: (tags) => tags.amenity === 'drinking_water',
    classify: (tags) => ({
      type: 'water',
      name: tags.name || 'Drinking Water',
      details: { ...extractCommonDetails(tags), waterType: 'drinking_water' as const },
    }),
  },
  {
    match: (tags) => tags.amenity === 'fountain' && tags.drinking_water === 'yes',
    classify: (tags) => ({
      type: 'water',
      name: tags.name || 'Fountain',
      details: { ...extractCommonDetails(tags), waterType: 'fountain' as const },
    }),
  },
  {
    match: (tags) => tags.man_made === 'water_tap',
    classify: (tags) => ({
      type: 'water',
      name: tags.name || 'Water Tap',
      details: { ...extractCommonDetails(tags), waterType: 'tap' as const },
    }),
  },
  {
    match: (tags) => tags.amenity === 'water_point',
    classify: (tags) => ({
      type: 'water',
      name: tags.name || 'Water Point',
      details: { ...extractCommonDetails(tags), waterType: 'water_point' as const },
    }),
  },
  {
    match: (tags) => tags.man_made === 'water_well' && tags.drinking_water === 'yes',
    classify: (tags) => ({
      type: 'water',
      name: tags.name || 'Water Well',
      details: { ...extractCommonDetails(tags), waterType: 'water_well' as const },
    }),
  },

  // === CAMPING & SHELTER ===
  {
    match: (tags) => tags.tourism === 'camp_site',
    classify: (tags) => ({
      type: 'campsite',
      name: tags.name || 'Campsite',
      details: {
        ...extractCommonDetails(tags),
        campsiteType: 'camp_site' as const,
        capacity: tags.capacity,
        fee: tags.fee === 'no' ? false : tags.fee === 'yes' ? true : undefined,
      },
    }),
  },
  {
    match: (tags) => tags.tourism === 'wilderness_hut',
    classify: (tags) => ({
      type: 'campsite',
      name: tags.name || 'Wilderness Hut',
      details: {
        ...extractCommonDetails(tags),
        campsiteType: 'wilderness_hut' as const,
        capacity: tags.capacity,
        fee: tags.fee === 'no' ? false : tags.fee === 'yes' ? true : undefined,
      },
    }),
  },
  {
    match: (tags) => tags.tourism === 'alpine_hut',
    classify: (tags) => ({
      type: 'alpine_hut',
      name: tags.name || 'Alpine Hut',
      details: {
        ...extractCommonDetails(tags),
        campsiteType: 'alpine_hut' as const,
        capacity: tags.capacity,
        fee: tags.fee === 'no' ? false : tags.fee === 'yes' ? true : undefined,
      },
    }),
  },
  {
    match: (tags) => tags.amenity === 'shelter',
    classify: (tags) => {
      const shelterType = tags.shelter_type;
      const isBasic = shelterType === 'lean_to' || shelterType === 'basic_hut';
      return {
        type: isBasic ? 'basic_shelter' : 'campsite',
        name: tags.name || (isBasic ? 'Shelter' : 'Shelter'),
        details: {
          ...extractCommonDetails(tags),
          campsiteType: isBasic ? 'basic_shelter' as const : 'shelter' as const,
        },
      };
    },
  },
  {
    match: (tags) => tags.camp_site === 'bivouac' || tags['camp_site:type'] === 'bivouac',
    classify: (tags) => ({
      type: 'campsite',
      name: tags.name || 'Bivouac',
      details: {
        ...extractCommonDetails(tags),
        campsiteType: 'bivouac' as const,
      },
    }),
  },

  // === REPAIR ===
  {
    match: (tags) => tags.shop === 'bicycle',
    classify: (tags) => ({
      type: 'repair',
      name: tags.name || 'Bike Shop',
      details: { ...extractCommonDetails(tags), repairType: 'shop' as const },
    }),
  },
  {
    match: (tags) => tags.amenity === 'bicycle_repair_station',
    classify: (tags) => ({
      type: 'repair',
      name: tags.name || 'Repair Station',
      details: { ...extractCommonDetails(tags), repairType: 'repair_station' as const },
    }),
  },
  {
    match: (tags) => tags.amenity === 'compressed_air',
    classify: (tags) => ({
      type: 'compressed_air',
      name: tags.name || 'Compressed Air',
      details: extractCommonDetails(tags),
    }),
  },

  // === MEDICAL ===
  {
    match: (tags) => tags.amenity === 'pharmacy',
    classify: (tags) => ({
      type: 'pharmacy',
      name: tags.name || 'Pharmacy',
      details: extractCommonDetails(tags),
    }),
  },

  // === HYGIENE ===
  {
    match: (tags) => tags.amenity === 'toilets',
    classify: (tags) => ({
      type: 'toilets',
      name: tags.name || 'Public Toilet',
      details: {
        ...extractCommonDetails(tags),
        fee: tags.fee === 'no' ? false : tags.fee === 'yes' ? true : undefined,
      },
    }),
  },

  // === BAIL-OUT ===
  {
    match: (tags) => tags.railway === 'station' && !!tags.name,
    classify: (tags) => ({
      type: 'train_station',
      name: tags.name!,
      details: extractCommonDetails(tags),
    }),
  },
  {
    match: (tags) => tags.railway === 'halt' && !!tags.name,
    classify: (tags) => ({
      type: 'halt',
      name: tags.name!,
      details: extractCommonDetails(tags),
    }),
  },
  {
    match: (tags) => tags.amenity === 'hospital' && !!tags.name,
    classify: (tags) => ({
      type: 'hospital',
      name: tags.name!,
      details: extractCommonDetails(tags),
    }),
  },
];

/**
 * Extract coordinates from an Overpass element.
 * Nodes have lat/lon directly; ways have center.lat/center.lon.
 */
function getCoordinates(el: OverpassElement): { lat: number; lng: number } | null {
  if (el.lat != null && el.lon != null) {
    return { lat: el.lat, lng: el.lon };
  }
  if (el.center?.lat != null && el.center?.lon != null) {
    return { lat: el.center.lat, lng: el.center.lon };
  }
  return null;
}

/**
 * Classify a single Overpass element into a SupplyPoint.
 * Returns null if the element can't be classified or has no coordinates.
 */
export function classifyElement(el: OverpassElement): Omit<SupplyPoint, 'distanceFromStartKm'> | null {
  const tags = el.tags;
  if (!tags) return null;

  const coords = getCoordinates(el);
  if (!coords) return null;

  for (const rule of RULES) {
    if (rule.match(tags)) {
      const { type, name, details } = rule.classify(tags, el);
      return {
        id: `${el.type[0]}${el.id}`,  // "n123456" for node, "w789" for way
        name,
        lat: coords.lat,
        lng: coords.lng,
        type,
        details,
      };
    }
  }

  return null;
}

/**
 * Classify multiple Overpass elements into SupplyPoints.
 * Skips elements that can't be classified and deduplicates by OSM ID.
 */
export function classifyElements(elements: OverpassElement[]): Omit<SupplyPoint, 'distanceFromStartKm'>[] {
  const seen = new Set<string>();
  const results: Omit<SupplyPoint, 'distanceFromStartKm'>[] = [];

  for (const el of elements) {
    try {
      const point = classifyElement(el);
      if (point && !seen.has(point.id)) {
        seen.add(point.id);
        results.push(point);
      }
    } catch {
      // Skip malformed elements
    }
  }

  return results;
}
