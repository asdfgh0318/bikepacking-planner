import { POI_CACHE_TTL_MS, INPOST_CACHE_TTL_MS } from '../config';
import type { SupplyPoint } from '../types';

/**
 * POI cache on plain IndexedDB.
 *
 * One record per (route hash, corridor width, source) query, holding the
 * classified supply points and a fetch timestamp. No WASM, no SQL — this has
 * to be fast and cheap on phones whose browsers interpret WebAssembly
 * (Vanadium on GrapheneOS runs WASM without JIT).
 */

export type CacheSource = 'overpass' | 'inpost';

interface CacheRecord {
  id: string;
  routeHash: string;
  source: CacheSource;
  fetchedAt: number;
  ttlMs: number;
  pois: SupplyPoint[];
}

const DB_NAME = 'bikepacking-poi';
const STORE = 'queries';
const LEGACY_DB_NAME = 'bikepacking-poi-cache'; // sql.js blob store, pre-2026-09

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => {
      // Free the space the old SQLite blob used; ignore failures.
      try { indexedDB.deleteDatabase(LEGACY_DB_NAME); } catch { /* no-op */ }
      resolve(req.result);
    };
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return requestToPromise(fn(db.transaction(STORE, mode).objectStore(STORE)));
}

function queryId(routeHash: string, corridorWidthKm: number, source: CacheSource): string {
  return `${routeHash}|${corridorWidthKm}|${source}`;
}

function isFresh(rec: CacheRecord, now = Date.now()): boolean {
  return now - rec.fetchedAt < rec.ttlMs;
}

/** Cached POIs for this exact query if present and not expired, else null. */
export async function getFreshCachedPOIs(
  routeHash: string,
  corridorWidthKm: number,
  source: CacheSource = 'overpass',
): Promise<SupplyPoint[] | null> {
  const rec = await withStore<CacheRecord | undefined>('readonly', (s) =>
    s.get(queryId(routeHash, corridorWidthKm, source)) as IDBRequest<CacheRecord | undefined>,
  );
  return rec && isFresh(rec) ? rec.pois : null;
}

/** Store the POIs for a query, replacing any previous record for it. */
export async function cachePOIs(
  routeHash: string,
  corridorWidthKm: number,
  pois: SupplyPoint[],
  source: CacheSource,
): Promise<void> {
  const rec: CacheRecord = {
    id: queryId(routeHash, corridorWidthKm, source),
    routeHash,
    source,
    fetchedAt: Date.now(),
    ttlMs: source === 'inpost' ? INPOST_CACHE_TTL_MS : POI_CACHE_TTL_MS,
    pois,
  };
  await withStore('readwrite', (s) => s.put(rec));
}

/** Delete every expired record. Returns how many were removed. */
export async function evictStaleCache(): Promise<number> {
  const all = await withStore<CacheRecord[]>('readonly', (s) => s.getAll());
  const now = Date.now();
  const stale = all.filter((r) => !isFresh(r, now));
  for (const r of stale) {
    await withStore('readwrite', (s) => s.delete(r.id));
  }
  return stale.length;
}

/** Wipe the whole cache. */
export async function clearCache(): Promise<void> {
  await withStore('readwrite', (s) => s.clear());
}
