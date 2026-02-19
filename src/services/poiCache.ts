import initSqlJs, { type Database } from 'sql.js';
import { POI_CACHE_TTL_MS, INPOST_CACHE_TTL_MS } from '../config';
import { debugLog } from '../utils/debugLogger';
import type { SupplyPoint } from '../types';

const SQL_WASM_URL = '/sql-wasm.wasm';
const IDB_NAME = 'bikepacking-poi-cache';
const IDB_STORE = 'sqlite';

let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

// ---------------------------------------------------------------------------
// Lazy initialisation — WASM is only loaded on first call
// ---------------------------------------------------------------------------

async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const SQL = await initSqlJs({ locateFile: () => SQL_WASM_URL });

    // Try to restore from IndexedDB
    const saved = await loadFromIndexedDB();
    dbInstance = saved ? new SQL.Database(saved) : new SQL.Database();

    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS poi_cache (
        osm_id TEXT PRIMARY KEY,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        type TEXT NOT NULL,
        name TEXT,
        classified_json TEXT NOT NULL,
        fetched_at INTEGER NOT NULL,
        route_hash TEXT
      );
      CREATE TABLE IF NOT EXISTS query_cache (
        id TEXT PRIMARY KEY,
        route_hash TEXT NOT NULL,
        corridor_km REAL NOT NULL,
        fetched_at INTEGER NOT NULL,
        ttl_ms INTEGER NOT NULL,
        poi_count INTEGER NOT NULL,
        source TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_poi_route ON poi_cache(route_hash);
      CREATE INDEX IF NOT EXISTS idx_poi_type ON poi_cache(type);
      CREATE INDEX IF NOT EXISTS idx_query_route ON query_cache(route_hash);
    `);

    debugLog.info('cache', 'sqlite:initialized', { restored: !!saved });
    return dbInstance;
  })();

  return initPromise;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether we already have a fresh (non-expired) cache entry for the
 * given route hash, corridor width, and data source.
 */
export async function hasFreshCache(
  routeHash: string,
  corridorWidthKm: number,
  source: 'overpass' | 'inpost' = 'overpass',
): Promise<boolean> {
  const db = await getDb();
  const ttl = source === 'inpost' ? INPOST_CACHE_TTL_MS : POI_CACHE_TTL_MS;
  const now = Date.now();

  const result = db.exec(
    `SELECT fetched_at FROM query_cache
     WHERE route_hash = '${routeHash}' AND corridor_km = ${corridorWidthKm} AND source = '${source}'
     ORDER BY fetched_at DESC LIMIT 1`
  );

  if (result.length === 0 || result[0].values.length === 0) return false;
  const fetchedAt = result[0].values[0][0] as number;
  return (now - fetchedAt) < ttl;
}

/**
 * Return all cached POIs for a given route hash.
 */
export async function getCachedPOIs(
  routeHash: string,
): Promise<SupplyPoint[]> {
  const db = await getDb();

  const result = db.exec(
    `SELECT classified_json FROM poi_cache WHERE route_hash = '${routeHash}'`
  );

  if (result.length === 0) return [];

  return result[0].values.map((row: unknown[]) => JSON.parse(row[0] as string) as SupplyPoint);
}

/**
 * Store POIs in the cache, replacing any previous data for the same
 * route hash + source combination.
 */
export async function cachePOIs(
  routeHash: string,
  corridorWidthKm: number,
  pois: SupplyPoint[],
  source: 'overpass' | 'inpost',
): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  const ttl = source === 'inpost' ? INPOST_CACHE_TTL_MS : POI_CACHE_TTL_MS;

  // Delete old POIs for this route hash + source
  db.run(`DELETE FROM poi_cache WHERE route_hash = '${routeHash}' AND type IN (
    SELECT DISTINCT p.type FROM poi_cache p
    JOIN query_cache q ON p.route_hash = q.route_hash
    WHERE q.source = '${source}' AND q.route_hash = '${routeHash}'
  )`);

  // Insert new POIs
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO poi_cache (osm_id, lat, lon, type, name, classified_json, fetched_at, route_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const poi of pois) {
    stmt.run([poi.id, poi.lat, poi.lng, poi.type, poi.name, JSON.stringify(poi), now, routeHash]);
  }
  stmt.free();

  // Record query metadata
  const queryId = `${routeHash}|${corridorWidthKm}|${source}`;
  db.run(
    `INSERT OR REPLACE INTO query_cache (id, route_hash, corridor_km, fetched_at, ttl_ms, poi_count, source)
     VALUES ('${queryId}', '${routeHash}', ${corridorWidthKm}, ${now}, ${ttl}, ${pois.length}, '${source}')`
  );

  // Persist to IndexedDB
  await persistToIndexedDB(db);

  debugLog.info('cache', 'poi:stored', { source, count: pois.length, routeHash: routeHash.slice(0, 8) });
}

/**
 * Remove all cache entries whose TTL has expired.
 * Returns the number of deleted POI rows.
 */
export async function evictStaleCache(): Promise<number> {
  const db = await getDb();
  const now = Date.now();

  // Find expired query hashes
  const expired = db.exec(
    `SELECT route_hash FROM query_cache WHERE (${now} - fetched_at) > ttl_ms`
  );

  if (expired.length === 0 || expired[0].values.length === 0) return 0;

  const hashes = expired[0].values.map((r: unknown[]) => `'${r[0]}'`).join(',');

  db.run(`DELETE FROM poi_cache WHERE route_hash IN (${hashes})`);
  const countResult = db.exec(`SELECT changes()`);
  const deletedPois = countResult.length > 0 ? (countResult[0].values[0][0] as number) : 0;

  db.run(`DELETE FROM query_cache WHERE (${now} - fetched_at) > ttl_ms`);

  await persistToIndexedDB(db);

  debugLog.info('cache', 'evict:stale', { deletedPois });
  return deletedPois;
}

/**
 * Wipe the entire cache (both tables).
 */
export async function clearCache(): Promise<void> {
  const db = await getDb();
  db.run('DELETE FROM poi_cache');
  db.run('DELETE FROM query_cache');
  await persistToIndexedDB(db);
  debugLog.info('cache', 'cleared');
}

/**
 * Return high-level statistics about the cache contents.
 */
export async function getCacheStats(): Promise<{
  totalPOIs: number;
  routesCached: number;
  dbSizeBytes: number;
  oldestEntryMs: number | null;
}> {
  const db = await getDb();

  const poiCount = db.exec('SELECT COUNT(*) FROM poi_cache');
  const routeCount = db.exec('SELECT COUNT(DISTINCT route_hash) FROM query_cache');
  const oldest = db.exec('SELECT MIN(fetched_at) FROM query_cache');

  const exported = db.export();

  return {
    totalPOIs: poiCount.length > 0 ? (poiCount[0].values[0][0] as number) : 0,
    routesCached: routeCount.length > 0 ? (routeCount[0].values[0][0] as number) : 0,
    dbSizeBytes: exported.byteLength,
    oldestEntryMs: oldest.length > 0 && oldest[0].values[0][0] != null
      ? (oldest[0].values[0][0] as number) : null,
  };
}

// ---------------------------------------------------------------------------
// IndexedDB persistence helpers
// ---------------------------------------------------------------------------

async function persistToIndexedDB(db: Database): Promise<void> {
  try {
    const data = db.export();
    const dbReq = indexedDB.open(IDB_NAME, 1);
    return new Promise((resolve, reject) => {
      dbReq.onupgradeneeded = () => {
        if (!dbReq.result.objectStoreNames.contains(IDB_STORE)) {
          dbReq.result.createObjectStore(IDB_STORE);
        }
      };
      dbReq.onsuccess = () => {
        const tx = dbReq.result.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(data, 'db');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      dbReq.onerror = () => reject(dbReq.error);
    });
  } catch (err) {
    debugLog.warn('cache', 'persist:failed', String(err));
  }
}

async function loadFromIndexedDB(): Promise<Uint8Array | null> {
  try {
    return new Promise((resolve) => {
      const dbReq = indexedDB.open(IDB_NAME, 1);
      dbReq.onupgradeneeded = () => {
        if (!dbReq.result.objectStoreNames.contains(IDB_STORE)) {
          dbReq.result.createObjectStore(IDB_STORE);
        }
      };
      dbReq.onsuccess = () => {
        const tx = dbReq.result.transaction(IDB_STORE, 'readonly');
        const getReq = tx.objectStore(IDB_STORE).get('db');
        getReq.onsuccess = () => resolve(getReq.result ?? null);
        getReq.onerror = () => resolve(null);
      };
      dbReq.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
