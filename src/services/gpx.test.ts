import { describe, it, expect, beforeAll } from 'vitest';
import { DOMParser } from '@xmldom/xmldom';
import { parseGpxToWaypoints, exportRouteToGpx } from './gpx';

// Polyfill DOMParser for Node environment (gpx.ts uses browser DOMParser)
beforeAll(() => {
  globalThis.DOMParser = DOMParser as unknown as typeof globalThis.DOMParser;
});

/* ------------------------------------------------------------------ */
/*  parseGpxToWaypoints                                               */
/* ------------------------------------------------------------------ */

describe('parseGpxToWaypoints', () => {
  it('parses valid GPX with <trkpt> elements into correct lat/lng array', () => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="51.1" lon="19.0"/>
    <trkpt lat="51.2" lon="19.1"/>
    <trkpt lat="51.3" lon="19.2"/>
  </trkseg></trk>
</gpx>`;

    const result = parseGpxToWaypoints(gpx);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ lat: 51.1, lng: 19.0 });
    expect(result[1]).toEqual({ lat: 51.2, lng: 19.1 });
    expect(result[2]).toEqual({ lat: 51.3, lng: 19.2 });
  });

  it('parses valid GPX with <rtept> elements into correct lat/lng array', () => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <rte>
    <rtept lat="50.0" lon="20.0"/>
    <rtept lat="50.5" lon="20.5"/>
  </rte>
</gpx>`;

    const result = parseGpxToWaypoints(gpx);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ lat: 50.0, lng: 20.0 });
    expect(result[1]).toEqual({ lat: 50.5, lng: 20.5 });
  });

  it('prefers <trkpt> over <rtept> when both are present', () => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="51.0" lon="19.0"/>
  </trkseg></trk>
  <rte>
    <rtept lat="50.0" lon="20.0"/>
    <rtept lat="50.5" lon="20.5"/>
  </rte>
</gpx>`;

    const result = parseGpxToWaypoints(gpx);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ lat: 51.0, lng: 19.0 });
  });

  it('returns empty array for GPX with no track or route points', () => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <metadata><name>Empty</name></metadata>
</gpx>`;

    const result = parseGpxToWaypoints(gpx);

    expect(result).toEqual([]);
  });

  it('returns empty array for invalid XML', () => {
    const result = parseGpxToWaypoints('this is not xml at all <<<>>>');

    expect(result).toEqual([]);
  });

  it('downsamples many points (>50) to approximately 50', () => {
    // Generate 200 track points along a line
    const points = Array.from({ length: 200 }, (_, i) => {
      const lat = 51.0 + i * 0.001;
      const lon = 19.0 + i * 0.001;
      return `    <trkpt lat="${lat}" lon="${lon}"/>`;
    }).join('\n');

    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk><trkseg>
${points}
  </trkseg></trk>
</gpx>`;

    const result = parseGpxToWaypoints(gpx);

    expect(result).toHaveLength(50);
    // First point is always kept
    expect(result[0]).toEqual({ lat: 51.0, lng: 19.0 });
    // Last point is always kept
    expect(result[49]).toEqual({ lat: 51.0 + 199 * 0.001, lng: 19.0 + 199 * 0.001 });
  });

  it('keeps all points when count is exactly 50', () => {
    const points = Array.from({ length: 50 }, (_, i) => {
      const lat = 51.0 + i * 0.01;
      const lon = 19.0 + i * 0.01;
      return `    <trkpt lat="${lat}" lon="${lon}"/>`;
    }).join('\n');

    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk><trkseg>
${points}
  </trkseg></trk>
</gpx>`;

    const result = parseGpxToWaypoints(gpx);

    expect(result).toHaveLength(50);
  });
});

/* ------------------------------------------------------------------ */
/*  exportRouteToGpx                                                  */
/* ------------------------------------------------------------------ */

describe('exportRouteToGpx', () => {
  it('exports waypoints as <trkpt> elements when no routeGeometry provided', () => {
    const waypoints = [
      { lat: 51.1, lng: 19.0 },
      { lat: 51.2, lng: 19.1 },
    ];

    const gpx = exportRouteToGpx(waypoints, null);

    expect(gpx).toContain('lat="51.1"');
    expect(gpx).toContain('lon="19"');
    expect(gpx).toContain('lat="51.2"');
    expect(gpx).toContain('lon="19.1"');
  });

  it('uses routeGeometry coordinates when LineString is provided', () => {
    const waypoints = [{ lat: 51.0, lng: 19.0 }];
    const geometry: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: [
        [19.0, 51.0],
        [19.5, 51.5],
        [20.0, 52.0],
      ],
    };

    const gpx = exportRouteToGpx(waypoints, geometry);

    // Should use geometry coordinates (lon, lat order in GeoJSON -> lat, lon in GPX)
    expect(gpx).toContain('lat="51"');
    expect(gpx).toContain('lon="19"');
    expect(gpx).toContain('lat="51.5"');
    expect(gpx).toContain('lon="19.5"');
    expect(gpx).toContain('lat="52"');
    expect(gpx).toContain('lon="20"');
    // Should NOT fall back to waypoints (only 1 waypoint, but 3 trkpts from geometry)
    expect(gpx.match(/<trkpt /g)!.length).toBe(3);
  });

  it('outputs proper GPX headers and namespace', () => {
    const gpx = exportRouteToGpx([{ lat: 51.0, lng: 19.0 }], null);

    expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(gpx).toContain('xmlns="http://www.topografix.com/GPX/1/1"');
    expect(gpx).toContain('<gpx version="1.1"');
    expect(gpx).toContain('creator="Bikepacking Planner"');
    expect(gpx).toContain('<trk>');
    expect(gpx).toContain('<trkseg>');
    expect(gpx).toContain('</trkseg>');
    expect(gpx).toContain('</trk>');
    expect(gpx).toContain('</gpx>');
  });

  it('includes custom name in metadata and track', () => {
    const gpx = exportRouteToGpx(
      [{ lat: 51.0, lng: 19.0 }],
      null,
      'My Bike Trip',
    );

    // Name should appear in both <metadata><name> and <trk><name>
    const nameMatches = gpx.match(/<name>My Bike Trip<\/name>/g);
    expect(nameMatches).toHaveLength(2);
  });

  it('uses default name when none is provided', () => {
    const gpx = exportRouteToGpx([{ lat: 51.0, lng: 19.0 }], null);

    expect(gpx).toContain('<name>Bikepacking Route</name>');
  });

  it('escapes XML special characters in name', () => {
    const gpx = exportRouteToGpx(
      [{ lat: 51.0, lng: 19.0 }],
      null,
      'Trip <A> & "B"',
    );

    expect(gpx).toContain('Trip &lt;A&gt; &amp; &quot;B&quot;');
    // Should NOT contain raw special characters
    expect(gpx).not.toContain('<name>Trip <A>');
  });

  it('includes elevation when present in geometry coordinates', () => {
    const geometry: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: [
        [19.0, 51.0, 250.0],
        [19.5, 51.5, 320.5],
        [20.0, 52.0, 180.3],
      ],
    };

    const gpx = exportRouteToGpx([], geometry);

    expect(gpx).toContain('<ele>250.0</ele>');
    expect(gpx).toContain('<ele>320.5</ele>');
    expect(gpx).toContain('<ele>180.3</ele>');
  });

  it('omits elevation tag when not present in geometry coordinates', () => {
    const geometry: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: [
        [19.0, 51.0],
        [20.0, 52.0],
      ],
    };

    const gpx = exportRouteToGpx([], geometry);

    expect(gpx).not.toContain('<ele>');
    expect(gpx).toContain('<trkpt lat="51" lon="19"/>');
    expect(gpx).toContain('<trkpt lat="52" lon="20"/>');
  });
});
