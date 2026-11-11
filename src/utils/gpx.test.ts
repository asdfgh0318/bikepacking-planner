import { describe, it, expect, beforeAll } from 'vitest';
import { DOMParser } from '@xmldom/xmldom';
import { parseGPX, thinTrack } from './gpx';

// Polyfill DOMParser for the Node environment.
beforeAll(() => {
  globalThis.DOMParser = DOMParser as unknown as typeof globalThis.DOMParser;
});

/** `count` track points heading north from `startLat`, 0.001 degrees apart. */
function seg(startLat: number, count: number, tag = 'trkpt'): string {
  let out = '';
  for (let i = 0; i < count; i++) out += `<${tag} lat="${(startLat + i * 0.001).toFixed(3)}" lon="19"/>`;
  return out;
}
const doc = (body: string) => `<?xml version="1.0"?><gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">${body}</gpx>`;

describe('parseGPX', () => {
  it('reads a single-track file and samples first and last point', () => {
    const { geometry, waypoints } = parseGPX(doc(`<trk><trkseg>${seg(51, 210)}</trkseg></trk>`));

    expect(geometry!.coordinates).toHaveLength(210);
    expect(waypoints).toHaveLength(10);
    expect(waypoints[0]).toMatchObject({ lat: 51, lng: 19 });
    expect(waypoints[9].lat).toBeCloseTo(51.209, 6);
  });

  it('joins every segment of a multi-segment track', () => {
    const { geometry, waypoints } = parseGPX(
      doc(`<trk><trkseg>${seg(51, 100)}</trkseg><trkseg>${seg(52, 100)}</trkseg></trk>`),
    );

    expect(geometry!.coordinates).toHaveLength(200);
    expect(geometry!.coordinates[100][1]).toBeCloseTo(52, 6);
    expect(waypoints[waypoints.length - 1].lat).toBeCloseTo(52.099, 6);
  });

  it('joins several tracks in document order with unique waypoint ids', () => {
    const { geometry, waypoints } = parseGPX(doc(
      `<trk><trkseg>${seg(51, 100)}</trkseg><trkseg>${seg(52, 100)}</trkseg></trk>` +
      `<trk><trkseg>${seg(53, 60)}</trkseg></trk>`,
    ));

    expect(geometry!.coordinates).toHaveLength(260);
    expect(geometry!.coordinates[0][1]).toBeCloseTo(51, 6);
    expect(geometry!.coordinates[259][1]).toBeCloseTo(53.059, 6);
    expect(new Set(waypoints.map((w) => w.id)).size).toBe(waypoints.length);
    expect(waypoints[0].lat).toBeCloseTo(51, 6);
    expect(waypoints[waypoints.length - 1].lat).toBeCloseTo(53.059, 6);
  });

  it('uses the track, not the route, when a file carries both', () => {
    const { geometry } = parseGPX(doc(
      `<rte>${seg(51, 5, 'rtept')}</rte><trk><trkseg>${seg(51, 40)}</trkseg></trk>`,
    ));
    expect(geometry!.coordinates).toHaveLength(40);
  });

  it('falls back to a route when there is no track', () => {
    const { geometry, waypoints } = parseGPX(doc(`<rte>${seg(51, 5, 'rtept')}</rte>`));
    expect(geometry!.coordinates).toHaveLength(5);
    expect(waypoints).toHaveLength(2);
  });

  it('returns nothing for a file without a line', () => {
    expect(parseGPX(doc('<wpt lat="51" lon="19"/>'))).toEqual({ waypoints: [], geometry: null });
  });
});

describe('thinTrack', () => {
  const track = (n: number): GeoJSON.Position[] => Array.from({ length: n }, (_, i) => [19, 50 + i * 1e-5]);

  it('leaves a track under the cap untouched', () => {
    const coords = track(100);
    expect(thinTrack(coords, 100)).toBe(coords);
  });

  it('thins a dense recording to the cap, keeping both ends', () => {
    const coords = track(20000);
    const thinned = thinTrack(coords, 5000);
    expect(thinned).toHaveLength(5000);
    expect(thinned[0]).toBe(coords[0]);
    expect(thinned[4999]).toBe(coords[19999]);
  });

  it('caps the geometry parseGPX returns', () => {
    const { geometry, waypoints } = parseGPX(doc(`<trk><trkseg>${seg(40, 6000)}</trkseg></trk>`));
    expect(geometry!.coordinates).toHaveLength(5000);
    expect(waypoints).toHaveLength(10);
    expect(waypoints[9].lat).toBeCloseTo(45.999, 6);
  });
});
