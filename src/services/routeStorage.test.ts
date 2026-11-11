import { describe, it, expect } from 'vitest';
import { encodeRouteToHash, decodeRouteFromHash } from './routeStorage';

const encode = (data: unknown) => btoa(JSON.stringify(data));

describe('decodeRouteFromHash', () => {
  it('round-trips an encoded route', () => {
    const hash = encodeRouteToHash('Trip', [
      { id: 'a', lat: 52.1, lng: 21.0 },
      { id: 'b', lat: 50.06, lng: 19.94 },
    ]);
    expect(decodeRouteFromHash(hash)).toEqual({
      name: 'Trip',
      waypoints: [
        { id: 'shared-0', lat: 52.1, lng: 21.0 },
        { id: 'shared-1', lat: 50.06, lng: 19.94 },
      ],
    });
  });

  it.each([
    ['entries missing the longitude', { w: [[52.1], [52.2]] }],
    ['non-numeric coordinates', { w: [['52.1', '21'], [52.2, 21]] }],
    ['null coordinates', { w: [[null, null], [52.2, 21]] }],
    ['out-of-range latitude', { w: [[152.1, 21], [52.2, 21]] }],
    ['out-of-range longitude', { w: [[52.1, 221], [52.2, 21]] }],
    ['w not an array', { w: 'nope' }],
    ['no w at all', { n: 'x' }],
    ['a non-object payload', 5],
  ])('rejects %s', (_label, payload) => {
    expect(decodeRouteFromHash(encode(payload))).toBeNull();
  });

  it('rejects text that is not base64 JSON', () => {
    expect(decodeRouteFromHash('%%%')).toBeNull();
  });
});
