import { fetchWithRetry } from '../utils/fetchWithRetry';
import { debugLog } from '../utils/debugLogger';

export interface MountainPass {
  id: string;
  name: string;
  lat: number;
  lng: number;
  elevation: number;
  distanceFromStartKm?: number;
}

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';

type SparqlBinding = Record<string, { value?: string } | undefined>;

export async function fetchMountainPasses(
  bounds: { south: number; north: number; west: number; east: number },
  signal?: AbortSignal
): Promise<MountainPass[]> {
  // Query for mountain passes (Q133056) and mountain saddles (Q2319177) within bbox
  const query = `
    SELECT ?item ?itemLabel ?lat ?lon ?elevation WHERE {
      VALUES ?type { wd:Q133056 wd:Q2319177 }
      ?item wdt:P31 ?type .
      ?item wdt:P625 ?coord .
      ?item wdt:P2044 ?elevation .
      SERVICE wikibase:box {
        ?item wdt:P625 ?coord .
        bd:serviceParam wikibase:cornerWest "Point(${bounds.west} ${bounds.south})"^^geo:wktLiteral .
        bd:serviceParam wikibase:cornerEast "Point(${bounds.east} ${bounds.north})"^^geo:wktLiteral .
      }
      BIND(geof:latitude(?coord) AS ?lat)
      BIND(geof:longitude(?coord) AS ?lon)
      SERVICE wikibase:label { bd:serviceParam wikibase:language "pl,en". }
    }
    LIMIT 50
  `;

  try {
    debugLog.info('wikidata', 'fetch:start', { bounds });

    const url = `${WIKIDATA_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
    const res = await fetchWithRetry(url, {
      headers: { 'Accept': 'application/sparql-results+json' },
      signal,
      timeout: 15000,
    });

    if (!res.ok) throw new Error(`Wikidata error: ${res.status}`);

    const data: { results?: { bindings?: SparqlBinding[] } } = await res.json();
    const results: MountainPass[] = (data.results?.bindings || []).map((b) => ({
      id: b.item?.value?.split('/').pop() || '',
      name: b.itemLabel?.value || 'Unknown',
      lat: parseFloat(b.lat?.value || '0'),
      lng: parseFloat(b.lon?.value || '0'),
      elevation: parseFloat(b.elevation?.value || '0'),
    })).filter((p) => p.lat !== 0 && p.lng !== 0 && p.elevation > 0);

    debugLog.info('wikidata', 'fetch:done', { count: results.length });
    return results;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    debugLog.warn('wikidata', 'fetch:error', err instanceof Error ? err.message : String(err));
    return []; // graceful fallback — no passes is fine
  }
}
