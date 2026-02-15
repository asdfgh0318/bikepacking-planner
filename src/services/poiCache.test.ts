import { describe, it, expect } from 'vitest';

describe('poiCache module', () => {
  it('exports all expected functions', async () => {
    const mod = await import('./poiCache');
    expect(typeof mod.hasFreshCache).toBe('function');
    expect(typeof mod.getCachedPOIs).toBe('function');
    expect(typeof mod.cachePOIs).toBe('function');
    expect(typeof mod.evictStaleCache).toBe('function');
    expect(typeof mod.clearCache).toBe('function');
    expect(typeof mod.getCacheStats).toBe('function');
  });
});
