import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getFreshCachedPOIs, cachePOIs, evictStaleCache, clearCache } from './poiCache';
import { POI_CACHE_TTL_MS } from '../config';
import type { SupplyPoint } from '../types';

const poi = (id: string): SupplyPoint => ({
  id, name: id, lat: 52, lng: 21, type: 'shop', distanceFromStartKm: 1,
});

describe('poiCache (IndexedDB)', () => {
  beforeEach(async () => { await clearCache(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns null on a miss', async () => {
    expect(await getFreshCachedPOIs('h', 2)).toBeNull();
  });

  it('round-trips POIs for the exact query key', async () => {
    await cachePOIs('h', 2, [poi('a'), poi('b')]);
    expect(await getFreshCachedPOIs('h', 2)).toEqual([poi('a'), poi('b')]);
    expect(await getFreshCachedPOIs('h', 3)).toBeNull();
  });

  it('replaces the previous record for the same query', async () => {
    await cachePOIs('h', 2, [poi('a')]);
    await cachePOIs('h', 2, [poi('z')]);
    expect(await getFreshCachedPOIs('h', 2)).toEqual([poi('z')]);
  });

  it('expires after the TTL', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
    await cachePOIs('h', 2, [poi('a')]);

    vi.setSystemTime(Date.now() + POI_CACHE_TTL_MS - 1000);
    expect(await getFreshCachedPOIs('h', 2)).toEqual([poi('a')]);

    vi.setSystemTime(Date.now() + 1001);
    expect(await getFreshCachedPOIs('h', 2)).toBeNull();
  });

  it('evicts only stale records', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
    await cachePOIs('old', 2, [poi('a')]);
    vi.setSystemTime(Date.now() + POI_CACHE_TTL_MS + 1);
    await cachePOIs('new', 2, [poi('b')]);

    expect(await evictStaleCache()).toBe(1);
    expect(await getFreshCachedPOIs('new', 2)).toEqual([poi('b')]);
    expect(await evictStaleCache()).toBe(0);
  });
});
