import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useRouteStore, mergePersistedRoute } from './routeStore';

const LINE: GeoJSON.LineString = { type: 'LineString', coordinates: [[19, 51], [19.1, 51.1]] };

describe('mergePersistedRoute', () => {
  const current = useRouteStore.getInitialState();

  it('treats an in-sync restored geometry as authoritative', () => {
    const merged = mergePersistedRoute({ routeGeometry: LINE, geometryStale: false }, current);
    expect(merged.gpxGeometryLoaded).toBe(true);
    expect(merged.routeGeometry).toEqual(LINE);
  });

  it('keeps state saved before the stale flag existed authoritative', () => {
    expect(mergePersistedRoute({ routeGeometry: LINE }, current).gpxGeometryLoaded).toBe(true);
  });

  it('does not trust a geometry saved out of sync with the waypoints', () => {
    const merged = mergePersistedRoute({ routeGeometry: LINE, geometryStale: true }, current);
    expect(merged.gpxGeometryLoaded).toBe(false);
  });

  it('has nothing authoritative without a geometry', () => {
    expect(mergePersistedRoute(undefined, current).gpxGeometryLoaded).toBe(false);
    expect(mergePersistedRoute({ routeGeometry: null }, current).gpxGeometryLoaded).toBe(false);
  });
});

describe('routeStore geometryStale', () => {
  beforeEach(() => {
    useRouteStore.setState(useRouteStore.getInitialState(), true);
  });

  it('is set by every edit that invalidates the geometry and cleared by a routed geometry', () => {
    const s = () => useRouteStore.getState();
    const edits: (() => void)[] = [
      () => s().addWaypoint(51, 19),
      () => s().updateWaypoint(s().waypoints[0].id, 51.5, 19.5),
      () => s().setRoutingProfile('fastbike'),
      () => s().setWaypoints([{ id: 'a', lat: 51, lng: 19 }, { id: 'b', lat: 52, lng: 20 }]),
      () => s().removeWaypoint('a'),
    ];
    for (const edit of edits) {
      s().setRouteGeometry(LINE);
      expect(s().geometryStale).toBe(false);
      edit();
      expect(s().geometryStale).toBe(true);
    }
  });

  it('keeps a straight-line fallback non-authoritative across a reload', () => {
    useRouteStore.getState().setRouteGeometry(LINE, false);
    const { routeGeometry, geometryStale } = useRouteStore.getState();
    const restored = mergePersistedRoute({ routeGeometry, geometryStale }, useRouteStore.getInitialState());
    expect(restored.gpxGeometryLoaded).toBe(false);
  });

  it('clearRoute resets the flag', () => {
    useRouteStore.getState().addWaypoint(51, 19);
    useRouteStore.getState().clearRoute();
    expect(useRouteStore.getState().geometryStale).toBe(false);
  });
});

describe('routeStore persistence', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists the stale flag', () => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => { data.set(k, v); },
      removeItem: (k: string) => { data.delete(k); },
    });
    useRouteStore.getState().setRouteGeometry(LINE);
    useRouteStore.getState().addWaypoint(51, 19);
    const saved = JSON.parse(data.get('bikepacking-route')!);
    expect(saved.state.geometryStale).toBe(true);
    expect(saved.state.routeGeometry).toEqual(LINE);
  });

  it('does not throw out of set() when the storage quota is exceeded', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => { throw new DOMException('quota', 'QuotaExceededError'); },
      removeItem: () => {},
    });
    expect(() => useRouteStore.getState().setRouteGeometry(LINE)).not.toThrow();
    expect(useRouteStore.getState().routeGeometry).toEqual(LINE);
  });
});
