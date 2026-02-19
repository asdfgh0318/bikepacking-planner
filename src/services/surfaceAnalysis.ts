import { lineString, length, point, nearestPointOnLine } from '@turf/turf';
import { OVERPASS_QUERY_TIMEOUT_S } from '../config';
import { debugLog } from '../utils/debugLogger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SurfaceType = 'paved' | 'gravel' | 'dirt' | 'sand' | 'unknown';

export interface SurfaceSegment {
  startKm: number;
  endKm: number;
  surface: SurfaceType;
}

export interface SurfaceSummary {
  segments: SurfaceSegment[];
  breakdown: Record<SurfaceType, number>; // percentage 0-100
}

/** Raw geometry node returned by Overpass `out geom;` for ways */
interface OverpassGeomNode {
  lat: number;
  lon: number;
}

/** Overpass way element with full geometry (from `out geom;`) */
export interface OverpassWayElement {
  type: 'way';
  id: number;
  tags?: Record<string, string>;
  geometry?: OverpassGeomNode[];
}

// ---------------------------------------------------------------------------
// Surface classification
// ---------------------------------------------------------------------------

const PAVED_SURFACES = new Set([
  'asphalt', 'concrete', 'paved', 'concrete:plates', 'concrete:lanes',
  'paving_stones', 'sett', 'metal',
]);

const GRAVEL_SURFACES = new Set(['gravel', 'compacted', 'fine_gravel']);
const GRAVEL_TRACKTYPES = new Set(['grade1', 'grade2']);

const DIRT_SURFACES = new Set(['dirt', 'earth', 'mud', 'ground', 'grass']);
const DIRT_TRACKTYPES = new Set(['grade3', 'grade4', 'grade5']);

const SAND_SURFACES = new Set(['sand']);

/**
 * Classify OSM tags into a surface type.
 */
export function classifySurface(tags: Record<string, string>): SurfaceType {
  const surface = tags.surface?.toLowerCase();
  const tracktype = tags.tracktype?.toLowerCase();

  if (surface) {
    if (PAVED_SURFACES.has(surface)) return 'paved';
    if (GRAVEL_SURFACES.has(surface)) return 'gravel';
    if (DIRT_SURFACES.has(surface)) return 'dirt';
    if (SAND_SURFACES.has(surface)) return 'sand';
  }

  if (tracktype) {
    if (GRAVEL_TRACKTYPES.has(tracktype)) return 'gravel';
    if (DIRT_TRACKTYPES.has(tracktype)) return 'dirt';
  }

  return 'unknown';
}

// ---------------------------------------------------------------------------
// Overpass query builder
// ---------------------------------------------------------------------------

/**
 * Build an Overpass QL query for ways with surface or tracktype tags
 * along a route polyline. Uses `out geom;` to get full way coordinates.
 */
export function buildSurfaceQuery(polyline: string, radiusM: number): string {
  return `[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_S}];
(
  way["surface"](around:${radiusM},${polyline});
  way["tracktype"](around:${radiusM},${polyline});
);
out geom;`;
}

// ---------------------------------------------------------------------------
// Surface analysis
// ---------------------------------------------------------------------------

/**
 * Analyze surface data from Overpass ways and build a SurfaceSummary
 * relative to the given route geometry.
 */
export function analyzeSurface(
  routeGeometry: GeoJSON.LineString,
  ways: OverpassWayElement[],
): SurfaceSummary {
  const routeLine = lineString(routeGeometry.coordinates);
  const totalLengthKm = length(routeLine, { units: 'kilometers' });

  if (totalLengthKm === 0) {
    return {
      segments: [{ startKm: 0, endKm: 0, surface: 'unknown' }],
      breakdown: { paved: 0, gravel: 0, dirt: 0, sand: 0, unknown: 100 },
    };
  }

  // For each way, compute start/end km along route and classify surface
  const rawSegments: SurfaceSegment[] = [];

  for (const way of ways) {
    if (!way.geometry || way.geometry.length < 2 || !way.tags) continue;

    const surface = classifySurface(way.tags);

    // Project first and last node of the way onto the route
    const positions: number[] = [];
    for (const node of way.geometry) {
      const pt = point([node.lon, node.lat]);
      const snapped = nearestPointOnLine(routeLine, pt);
      const locationKm = snapped.properties.location ?? 0;
      positions.push(locationKm);
    }

    const startKm = Math.min(...positions);
    const endKm = Math.max(...positions);

    // Skip very tiny segments (< 50m) — noise
    if (endKm - startKm < 0.05) continue;

    rawSegments.push({
      startKm: Math.max(0, startKm),
      endKm: Math.min(totalLengthKm, endKm),
      surface,
    });
  }

  // Sort by startKm
  rawSegments.sort((a, b) => a.startKm - b.startKm);

  debugLog.debug('surface', 'analyze:raw-segments', {
    wayCount: ways.length,
    rawSegmentCount: rawSegments.length,
  });

  // Merge overlapping segments with same surface and fill gaps with 'unknown'
  const merged = mergeAndFillSegments(rawSegments, totalLengthKm);

  // Compute percentage breakdown
  const breakdown: Record<SurfaceType, number> = {
    paved: 0, gravel: 0, dirt: 0, sand: 0, unknown: 0,
  };

  for (const seg of merged) {
    const lengthKm = seg.endKm - seg.startKm;
    breakdown[seg.surface] += lengthKm;
  }

  // Convert to percentages
  for (const key of Object.keys(breakdown) as SurfaceType[]) {
    breakdown[key] = Math.round((breakdown[key] / totalLengthKm) * 100);
  }

  // Ensure percentages sum to 100 (fix rounding)
  const sum = Object.values(breakdown).reduce((a, b) => a + b, 0);
  if (sum !== 100 && merged.length > 0) {
    // Adjust the largest category
    const maxKey = (Object.keys(breakdown) as SurfaceType[]).reduce(
      (a, b) => (breakdown[a] >= breakdown[b] ? a : b)
    );
    breakdown[maxKey] += 100 - sum;
  }

  debugLog.info('surface', 'analyze:done', {
    segmentCount: merged.length,
    breakdown,
  });

  return { segments: merged, breakdown };
}

/**
 * Merge overlapping segments with the same surface type and fill gaps
 * with 'unknown'. Handles overlapping segments by giving priority to
 * non-unknown surfaces.
 */
function mergeAndFillSegments(
  segments: SurfaceSegment[],
  totalLengthKm: number,
): SurfaceSegment[] {
  if (segments.length === 0) {
    return [{ startKm: 0, endKm: totalLengthKm, surface: 'unknown' }];
  }

  // Discretize into 100m bins for overlap resolution
  const binSizeKm = 0.1;
  const binCount = Math.ceil(totalLengthKm / binSizeKm);
  const bins: SurfaceType[] = new Array(binCount).fill('unknown');

  // Priority: paved > gravel > dirt > sand > unknown
  const priority: Record<SurfaceType, number> = {
    paved: 4, gravel: 3, dirt: 2, sand: 1, unknown: 0,
  };

  for (const seg of segments) {
    const startBin = Math.floor(seg.startKm / binSizeKm);
    const endBin = Math.min(binCount - 1, Math.floor(seg.endKm / binSizeKm));
    for (let i = startBin; i <= endBin; i++) {
      if (priority[seg.surface] > priority[bins[i]]) {
        bins[i] = seg.surface;
      }
    }
  }

  // Convert bins back to segments by merging consecutive bins with same surface
  const result: SurfaceSegment[] = [];
  let currentSurface = bins[0];
  let currentStartKm = 0;

  for (let i = 1; i < binCount; i++) {
    if (bins[i] !== currentSurface) {
      result.push({
        startKm: currentStartKm,
        endKm: i * binSizeKm,
        surface: currentSurface,
      });
      currentSurface = bins[i];
      currentStartKm = i * binSizeKm;
    }
  }

  // Add final segment
  result.push({
    startKm: currentStartKm,
    endKm: totalLengthKm,
    surface: currentSurface,
  });

  return result;
}
