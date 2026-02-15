import { describe, it, expect } from 'vitest';
import { classifyElement, classifyElements, type OverpassElement } from './poiClassifier';

function makeNode(id: number, tags: Record<string, string>, lat = 52.0, lon = 21.0): OverpassElement {
  return { type: 'node', id, lat, lon, tags };
}

function makeWay(id: number, tags: Record<string, string>, lat = 52.0, lon = 21.0): OverpassElement {
  return { type: 'way', id, tags, center: { lat, lon } };
}

describe('classifyElement', () => {
  describe('brand detection', () => {
    it('classifies Żabka by wikidata ID', () => {
      const el = makeNode(1, { 'brand:wikidata': 'Q2874810', name: 'Żabka' });
      const result = classifyElement(el);
      expect(result?.type).toBe('zabka');
      expect(result?.name).toBe('Żabka');
      expect(result?.details?.brand).toBe('Żabka');
    });

    it('classifies Biedronka by wikidata ID', () => {
      const el = makeNode(2, { 'brand:wikidata': 'Q857855', name: 'Biedronka' });
      const result = classifyElement(el);
      expect(result?.type).toBe('biedronka');
    });

    it('classifies Lidl by wikidata ID', () => {
      const el = makeNode(3, { 'brand:wikidata': 'Q111', name: 'Lidl' });
      const result = classifyElement(el);
      expect(result?.type).toBe('supermarket');
      expect(result?.details?.brand).toBe('Lidl');
    });

    it('classifies Dino by wikidata ID', () => {
      const el = makeNode(4, { 'brand:wikidata': 'Q2462707', name: 'Dino' });
      const result = classifyElement(el);
      expect(result?.type).toBe('supermarket');
    });
  });

  describe('shops', () => {
    it('classifies generic supermarket', () => {
      const el = makeNode(10, { shop: 'supermarket', name: 'Local Market' });
      const result = classifyElement(el);
      expect(result?.type).toBe('supermarket');
    });

    it('classifies convenience store', () => {
      const el = makeNode(11, { shop: 'convenience', name: 'Mini Sklep' });
      const result = classifyElement(el);
      expect(result?.type).toBe('convenience');
    });

    it('classifies bakery', () => {
      const el = makeNode(12, { shop: 'bakery', name: 'Piekarnia' });
      const result = classifyElement(el);
      expect(result?.type).toBe('bakery');
    });
  });

  describe('food service', () => {
    it('classifies cafe', () => {
      const el = makeNode(20, { amenity: 'cafe', name: 'Coffee House' });
      const result = classifyElement(el);
      expect(result?.type).toBe('cafe');
    });

    it('classifies restaurant', () => {
      const el = makeNode(21, { amenity: 'restaurant', name: 'Restauracja Pod Lipą' });
      const result = classifyElement(el);
      expect(result?.type).toBe('restaurant');
    });

    it('classifies fuel station', () => {
      const el = makeNode(22, { amenity: 'fuel', brand: 'Orlen', toilets: 'yes', drinking_water: 'yes' });
      const result = classifyElement(el);
      expect(result?.type).toBe('fuel');
      expect(result?.details?.hasToilet).toBe(true);
      expect(result?.details?.hasWater).toBe(true);
    });
  });

  describe('water sources', () => {
    it('classifies spring', () => {
      const el = makeNode(30, { natural: 'spring' });
      const result = classifyElement(el);
      expect(result?.type).toBe('water');
      expect(result?.details?.waterType).toBe('spring');
    });

    it('classifies drinking water', () => {
      const el = makeNode(31, { amenity: 'drinking_water' });
      const result = classifyElement(el);
      expect(result?.type).toBe('water');
      expect(result?.details?.waterType).toBe('drinking_water');
    });

    it('classifies drinkable fountain', () => {
      const el = makeNode(32, { amenity: 'fountain', drinking_water: 'yes' });
      const result = classifyElement(el);
      expect(result?.type).toBe('water');
      expect(result?.details?.waterType).toBe('fountain');
    });

    it('classifies water tap', () => {
      const el = makeNode(33, { man_made: 'water_tap' });
      const result = classifyElement(el);
      expect(result?.type).toBe('water');
      expect(result?.details?.waterType).toBe('tap');
    });

    it('classifies water point', () => {
      const el = makeNode(34, { amenity: 'water_point' });
      const result = classifyElement(el);
      expect(result?.type).toBe('water');
      expect(result?.details?.waterType).toBe('water_point');
    });

    it('classifies drinkable well', () => {
      const el = makeNode(35, { man_made: 'water_well', drinking_water: 'yes' });
      const result = classifyElement(el);
      expect(result?.type).toBe('water');
      expect(result?.details?.waterType).toBe('water_well');
    });
  });

  describe('camping & shelter', () => {
    it('classifies campsite', () => {
      const el = makeNode(40, { tourism: 'camp_site', name: 'Camping Pod Sosnami', capacity: '50', fee: 'yes' });
      const result = classifyElement(el);
      expect(result?.type).toBe('campsite');
      expect(result?.details?.campsiteType).toBe('camp_site');
      expect(result?.details?.capacity).toBe('50');
      expect(result?.details?.fee).toBe(true);
    });

    it('classifies wilderness hut', () => {
      const el = makeNode(41, { tourism: 'wilderness_hut', fee: 'no' });
      const result = classifyElement(el);
      expect(result?.type).toBe('campsite');
      expect(result?.details?.campsiteType).toBe('wilderness_hut');
      expect(result?.details?.fee).toBe(false);
    });

    it('classifies alpine hut', () => {
      const el = makeNode(42, { tourism: 'alpine_hut', name: 'Schronisko' });
      const result = classifyElement(el);
      expect(result?.type).toBe('alpine_hut');
      expect(result?.details?.campsiteType).toBe('alpine_hut');
    });

    it('classifies lean-to shelter as basic_shelter', () => {
      const el = makeNode(43, { amenity: 'shelter', shelter_type: 'lean_to' });
      const result = classifyElement(el);
      expect(result?.type).toBe('basic_shelter');
      expect(result?.details?.campsiteType).toBe('basic_shelter');
    });

    it('classifies generic shelter as campsite', () => {
      const el = makeNode(44, { amenity: 'shelter' });
      const result = classifyElement(el);
      expect(result?.type).toBe('campsite');
      expect(result?.details?.campsiteType).toBe('shelter');
    });

    it('classifies bivouac', () => {
      const el = makeNode(45, { camp_site: 'bivouac' });
      const result = classifyElement(el);
      expect(result?.type).toBe('campsite');
      expect(result?.details?.campsiteType).toBe('bivouac');
    });
  });

  describe('repair', () => {
    it('classifies bike shop', () => {
      const el = makeNode(50, { shop: 'bicycle', name: 'Rowerowy Świat' });
      const result = classifyElement(el);
      expect(result?.type).toBe('repair');
      expect(result?.details?.repairType).toBe('shop');
    });

    it('classifies repair station', () => {
      const el = makeNode(51, { amenity: 'bicycle_repair_station' });
      const result = classifyElement(el);
      expect(result?.type).toBe('repair');
      expect(result?.details?.repairType).toBe('repair_station');
    });

    it('classifies compressed air', () => {
      const el = makeNode(52, { amenity: 'compressed_air' });
      const result = classifyElement(el);
      expect(result?.type).toBe('compressed_air');
    });
  });

  describe('medical & hygiene', () => {
    it('classifies pharmacy', () => {
      const el = makeNode(60, { amenity: 'pharmacy', name: 'Apteka' });
      const result = classifyElement(el);
      expect(result?.type).toBe('pharmacy');
    });

    it('classifies public toilet', () => {
      const el = makeNode(61, { amenity: 'toilets', fee: 'no' });
      const result = classifyElement(el);
      expect(result?.type).toBe('toilets');
      expect(result?.details?.fee).toBe(false);
    });
  });

  describe('bail-out', () => {
    it('classifies train station', () => {
      const el = makeNode(70, { railway: 'station', name: 'Warszawa Centralna' });
      const result = classifyElement(el);
      expect(result?.type).toBe('train_station');
    });

    it('classifies train halt', () => {
      const el = makeNode(71, { railway: 'halt', name: 'Wólka' });
      const result = classifyElement(el);
      expect(result?.type).toBe('halt');
    });

    it('classifies hospital', () => {
      const el = makeNode(72, { amenity: 'hospital', name: 'Szpital Miejski' });
      const result = classifyElement(el);
      expect(result?.type).toBe('hospital');
    });

    it('skips station without name', () => {
      const el = makeNode(73, { railway: 'station' });
      const result = classifyElement(el);
      expect(result).toBeNull();
    });
  });

  describe('coordinate handling', () => {
    it('handles node coordinates', () => {
      const el = makeNode(80, { amenity: 'cafe', name: 'Test' }, 52.23, 21.01);
      const result = classifyElement(el);
      expect(result?.lat).toBe(52.23);
      expect(result?.lng).toBe(21.01);
    });

    it('handles way center coordinates', () => {
      const el = makeWay(81, { shop: 'supermarket', name: 'Test' }, 52.23, 21.01);
      const result = classifyElement(el);
      expect(result?.lat).toBe(52.23);
      expect(result?.lng).toBe(21.01);
    });

    it('returns null for missing coordinates', () => {
      const el: OverpassElement = { type: 'way', id: 82, tags: { shop: 'supermarket' } };
      const result = classifyElement(el);
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('returns null for no tags', () => {
      const el: OverpassElement = { type: 'node', id: 90, lat: 52, lon: 21 };
      const result = classifyElement(el);
      expect(result).toBeNull();
    });

    it('returns null for unrecognized tags', () => {
      const el = makeNode(91, { building: 'yes' });
      const result = classifyElement(el);
      expect(result).toBeNull();
    });

    it('generates correct OSM IDs', () => {
      const node = classifyElement(makeNode(123, { amenity: 'cafe', name: 'Test' }));
      expect(node?.id).toBe('n123');
      const way = classifyElement(makeWay(456, { shop: 'supermarket', name: 'Test' }));
      expect(way?.id).toBe('w456');
    });

    it('extracts address from addr tags', () => {
      const el = makeNode(92, { amenity: 'cafe', name: 'Test', 'addr:street': 'Marszałkowska', 'addr:housenumber': '1', 'addr:city': 'Warszawa' });
      const result = classifyElement(el);
      expect(result?.details?.address).toBe('Marszałkowska 1 Warszawa');
    });

    it('brand takes priority over generic shop type', () => {
      const el = makeNode(93, { shop: 'convenience', 'brand:wikidata': 'Q2874810', name: 'Żabka', brand: 'Żabka' });
      const result = classifyElement(el);
      expect(result?.type).toBe('zabka'); // brand match, not convenience
    });
  });
});

describe('classifyElements', () => {
  it('classifies multiple elements', () => {
    const elements: OverpassElement[] = [
      makeNode(1, { amenity: 'cafe', name: 'Cafe A' }),
      makeNode(2, { shop: 'supermarket', name: 'Market B' }),
      makeNode(3, { natural: 'spring' }),
    ];
    const results = classifyElements(elements);
    expect(results.length).toBe(3);
  });

  it('deduplicates by ID', () => {
    const elements: OverpassElement[] = [
      makeNode(1, { amenity: 'cafe', name: 'Cafe' }),
      makeNode(1, { amenity: 'cafe', name: 'Cafe' }), // duplicate
    ];
    const results = classifyElements(elements);
    expect(results.length).toBe(1);
  });

  it('skips unclassifiable elements', () => {
    const elements: OverpassElement[] = [
      makeNode(1, { building: 'yes' }), // unrecognized
      makeNode(2, { amenity: 'cafe', name: 'Good' }),
    ];
    const results = classifyElements(elements);
    expect(results.length).toBe(1);
    expect(results[0].type).toBe('cafe');
  });
});
