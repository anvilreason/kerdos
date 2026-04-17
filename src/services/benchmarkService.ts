/**
 * Benchmark service — fetches historical index/crypto series from the Kerdos
 * quote-relay Worker (W1-03, see worker/src/index.ts → handleBenchmark).
 *
 * Worker payload shape (verbatim from worker/src/providers/types.ts +
 * worker/src/index.ts handleBenchmark response):
 *   {
 *     id: string;          // provider id, e.g. "^gspc", "000300.ss", "bitcoin"
 *     name: string;
 *     currency: string;
 *     source: string;      // "stooq" | "coingecko"
 *     asOf: string;        // ISO
 *     points: { t: string; v: number }[];   // t = ISO date, v = close
 *     cachedAt: string;    // ISO, Worker-side cache write time
 *     stale: boolean;      // true if Worker fell back to stale cache
 *   }
 *
 * We re-shape `points` to `{ date, value }` so UI code doesn't have to know
 * about the short keys. Normalisation (start = 100) happens in the chart
 * layer, not here — the service stays raw.
 */

export type BenchmarkId = 'sp500' | 'csi300' | 'btc';

/**
 * Worker only supports these four ranges (see benchmarkQuerySchema in
 * worker/src/index.ts). `6m` is intentionally NOT exposed — the Worker
 * would reject it with a 400.
 */
export type BenchmarkRange = '1m' | '3m' | '1y' | 'all';

export interface BenchmarkPoint {
  date: string; // ISO date string (as returned by the Worker)
  value: number;
}

export interface BenchmarkResult {
  id: BenchmarkId;
  range: BenchmarkRange;
  /** Provider-side id / name — kept for debug + tooltip labelling. */
  providerId: string;
  name: string;
  currency: string;
  points: BenchmarkPoint[];
  source: string; // "stooq" | "coingecko"
  stale: boolean;
  fetchedAt: number;
}

// --- Config ----------------------------------------------------------------

const CACHE_CAP = 20;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min — benchmark data moves slowly
const REQUEST_TIMEOUT_MS = 3000; // a touch higher than /price because bigger payload

// --- Env / base URL (mirrors priceService.getRelayBaseUrl) -----------------

function getRelayBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_KERDOS_RELAY;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.replace(/\/$/, '');
  }
  if (import.meta.env.DEV) return 'http://localhost:8787';
  return '';
}

// --- LRU + TTL cache -------------------------------------------------------

interface BenchmarkCacheEntry {
  result: BenchmarkResult;
  expiresAt: number;
}

const cache = new Map<string, BenchmarkCacheEntry>();

function cacheKey(id: BenchmarkId, range: BenchmarkRange): string {
  return `${id}|${range}`;
}

function readCache(key: string): BenchmarkResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  // LRU touch: re-insert to move to the end
  cache.delete(key);
  cache.set(key, entry);
  return entry.result;
}

function writeCache(key: string, result: BenchmarkResult): void {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  while (cache.size > CACHE_CAP) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

// --- Worker response typing ------------------------------------------------

interface WorkerBenchmarkPoint {
  t: string;
  v: number;
}

interface WorkerBenchmarkResponse {
  id?: string;
  name?: string;
  currency?: string;
  source?: string;
  asOf?: string;
  points?: WorkerBenchmarkPoint[];
  cachedAt?: string;
  stale?: boolean;
  /** Present only on error responses. */
  error?: string;
}

// --- Public API ------------------------------------------------------------

/**
 * Fetch a benchmark history series from the Worker.
 *
 * Contract:
 * - Never throws. Returns null on any failure (network, timeout, non-2xx,
 *   malformed payload, empty `points`). UI is expected to degrade to an
 *   "unavailable" state.
 * - Cached in-memory (LRU 20, TTL 10 min) keyed by `${id}|${range}`.
 * - 3 s request timeout via AbortSignal.
 */
export async function getBenchmark(
  id: BenchmarkId,
  range: BenchmarkRange,
): Promise<BenchmarkResult | null> {
  const key = cacheKey(id, range);

  const cached = readCache(key);
  if (cached) return cached;

  const base = getRelayBaseUrl();
  if (!base) {
    console.warn('[benchmarkService] no VITE_KERDOS_RELAY configured');
    return null;
  }

  const url = `${base}/benchmark?id=${encodeURIComponent(id)}&range=${encodeURIComponent(range)}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      console.warn(`[benchmarkService] HTTP ${res.status} for ${id}/${range}`);
      return null;
    }
    const data = (await res.json()) as WorkerBenchmarkResponse;
    if (data.error) {
      console.warn(`[benchmarkService] Worker error for ${id}/${range}: ${data.error}`);
      return null;
    }
    const rawPoints = Array.isArray(data.points) ? data.points : [];
    if (rawPoints.length === 0) {
      console.warn(`[benchmarkService] empty points for ${id}/${range}`);
      return null;
    }

    const points: BenchmarkPoint[] = [];
    for (const p of rawPoints) {
      if (!p || typeof p.t !== 'string' || typeof p.v !== 'number' || !Number.isFinite(p.v)) {
        continue;
      }
      points.push({ date: p.t, value: p.v });
    }
    if (points.length === 0) {
      console.warn(`[benchmarkService] no valid points after filter for ${id}/${range}`);
      return null;
    }

    const result: BenchmarkResult = {
      id,
      range,
      providerId: data.id ?? id,
      name: data.name ?? id,
      currency: data.currency ?? 'USD',
      points,
      source: data.source ?? 'unknown',
      stale: Boolean(data.stale),
      fetchedAt: Date.now(),
    };

    writeCache(key, result);
    return result;
  } catch (err) {
    console.warn(`[benchmarkService] fetch failed for ${id}/${range}:`, err);
    return null;
  }
}

/**
 * Test-only: clear the in-memory cache. Exported for completeness, not used
 * anywhere in production code paths.
 */
export function _clearBenchmarkCache(): void {
  cache.clear();
}
