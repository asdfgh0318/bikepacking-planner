import { describe, it, expect } from 'vitest';
import { cullMarkers, type MapView } from './markerCulling';
import type { SupplyPoint } from '../../types';

const pt = (type: SupplyPoint['type'], lat: number, lng: number) => ({ type, lat, lng });
const view = (zoom: number): MapView => ({ zoom, west: 19, east: 20, south: 50, north: 51 });

describe('cullMarkers', () => {
  it('returns everything until the map has reported a view', () => {
    const points = [pt('cafe', 10, 10), pt('shop', 50.5, 19.5)];
    expect(cullMarkers(points, null)).toBe(points);
  });

  it('drops points outside the padded viewport', () => {
    const inside = pt('shop', 50.5, 19.5);
    const inPadding = pt('shop', 51.1, 20.1);
    const outside = pt('shop', 51.5, 19.5);
    const farEast = pt('shop', 50.5, 21);
    expect(cullMarkers([inside, inPadding, outside, farEast], view(12))).toEqual([inside, inPadding]);
  });

  it('hides minor types when zoomed out but keeps resupply, water and sleep', () => {
    const points = [pt('cafe', 50.5, 19.5), pt('toilets', 50.5, 19.5), pt('zabka', 50.5, 19.5), pt('water', 50.5, 19.5), pt('campsite', 50.5, 19.5), pt('fuel', 50.5, 19.5)];
    expect(cullMarkers(points, view(8)).map((p) => p.type)).toEqual(['zabka', 'water', 'campsite', 'fuel']);
    expect(cullMarkers(points, view(9))).toHaveLength(6);
  });
});
