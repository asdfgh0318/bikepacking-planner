import { describe, it, expect, vi, afterEach } from 'vitest';
import { queryOverpassWithFailover } from './overpass';
import { OVERPASS_ENDPOINTS } from '../config';

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe('queryOverpassWithFailover', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the elements of a normal response', async () => {
    const fetchMock = vi.fn(async () => json({ elements: [{ type: 'node', id: 1 }] }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(queryOverpassWithFailover('q')).resolves.toEqual([{ type: 'node', id: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails over when a 200 response carries a runtime-error remark', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url === OVERPASS_ENDPOINTS[0]
        ? json({ elements: [{ type: 'node', id: 1 }], remark: 'runtime error: Query timed out in "query" at line 3 after 26 seconds.' })
        : json({ elements: [{ type: 'node', id: 1 }, { type: 'node', id: 2 }] }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(queryOverpassWithFailover('q')).resolves.toHaveLength(2);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([OVERPASS_ENDPOINTS[0], OVERPASS_ENDPOINTS[1]]);
  });

  it('rejects when every endpoint reports a runtime error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ elements: [], remark: 'runtime error: out of memory' })));
    await expect(queryOverpassWithFailover('q')).rejects.toThrow(/out of memory/);
  });

  it('rejects a response without an elements array', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ nope: true })));
    await expect(queryOverpassWithFailover('q')).rejects.toThrow(/malformed/);
  });
});
