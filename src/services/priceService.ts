import type { AssetType } from '@/types/asset';
import type { PriceResult, PriceCache } from '@/types/price';
import { db } from '@/db';
import { fetchYahooFinancePrice } from './providers/yahooFinance';
import { fetchCoinGeckoPrice } from './providers/coinGecko';
import { fetchExchangeRate } from './providers/exchangeRate';
import { fetchMetalPrice } from './providers/metals';

// ---------------------------------------------------------------------------
// Ticker search (W2-01)
// ---------------------------------------------------------------------------

/**
 * A single ticker search result, as surfaced to the UI layer.
 * Exported here so both the TickerSearch component and priceService share the
 * same shape.
 */
export interface TickerResult {
  symbol: string;
  name: string;
  exchange?: string;
  type: AssetType;
  currency: string;
  source: 'worker' | 'local';
}

/** Raw Worker /search response entry (from worker/src/providers/types.ts). */
interface WorkerSearchEntry {
  ticker: string;
  name: string;
  exchange?: string;
  type?: string; // Yahoo quoteType ('EQUITY' | 'ETF' | 'MUTUALFUND' | ...) or 'cryptocurrency'
  source: 'yahoo' | 'coingecko';
}

interface WorkerSearchResponse {
  results?: WorkerSearchEntry[];
  cached?: boolean;
  stale?: boolean;
}

/** Resolves the Worker base URL; empty string means "no worker configured". */
function getRelayBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_KERDOS_RELAY;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.replace(/\/$/, '');
  }
  // Dev default — production build leaves this empty on purpose so we fall
  // back to the legacy CORS-proxy providers until W4 flips the switch.
  if (import.meta.env.DEV) return 'http://localhost:8787';
  return '';
}

/**
 * Map a Worker SearchResult entry into our AssetType + currency.
 * The Worker /search payload does not carry currency, so we infer it from
 * exchange + quoteType. Unknown types fall back to 'other'.
 */
function mapWorkerEntry(entry: WorkerSearchEntry): TickerResult | null {
  const symbol = entry.ticker?.toUpperCase();
  if (!symbol) return null;

  // --- Crypto ---
  if (entry.source === 'coingecko' || entry.type === 'cryptocurrency') {
    return {
      symbol,
      name: entry.name || symbol,
      exchange: undefined,
      type: 'crypto',
      currency: 'USD',
      source: 'worker',
    };
  }

  // --- Yahoo ---
  const rawType = (entry.type ?? '').toUpperCase();
  const exch = entry.exchange;
  let assetType: AssetType;
  let currency: string;

  // ETF detection first — Yahoo sometimes tags on 'ETF'
  if (rawType === 'ETF') {
    assetType = 'etf';
    currency = exchangeToCurrency(exch, 'USD');
  } else if (rawType === 'CURRENCY') {
    assetType = 'forex';
    currency = inferForexCurrency(symbol);
  } else if (rawType === 'EQUITY' || rawType === '' || rawType === 'MUTUALFUND') {
    // Derive market from the symbol suffix; exchange alone is unreliable.
    if (/\.SS$|\.SZ$/.test(symbol)) {
      assetType = 'cn_stock';
      currency = 'CNY';
    } else if (/\.HK$/.test(symbol)) {
      assetType = 'cn_stock'; // Hong Kong listings reuse cn_stock for now
      currency = 'HKD';
    } else {
      assetType = 'us_stock';
      currency = exchangeToCurrency(exch, 'USD');
    }
  } else {
    assetType = 'other';
    currency = exchangeToCurrency(exch, 'USD');
  }

  return {
    symbol,
    name: entry.name || symbol,
    exchange: exch,
    type: assetType,
    currency,
    source: 'worker',
  };
}

function exchangeToCurrency(exchange: string | undefined, fallback: string): string {
  if (!exchange) return fallback;
  const exch = exchange.toUpperCase();
  if (exch.includes('SHANGHAI') || exch === 'SSE' || exch === 'SHH') return 'CNY';
  if (exch.includes('SHENZHEN') || exch === 'SZSE' || exch === 'SHZ') return 'CNY';
  if (exch.includes('HONG KONG') || exch === 'HKEX' || exch === 'HKG') return 'HKD';
  if (exch.includes('TOKYO') || exch === 'TSE' || exch === 'JPX') return 'JPY';
  if (exch.includes('LONDON') || exch === 'LSE') return 'GBP';
  if (exch.includes('FRANKFURT') || exch === 'XETRA') return 'EUR';
  return fallback;
}

function inferForexCurrency(symbol: string): string {
  // Yahoo forex symbols look like "EURUSD=X"; the quote currency is the last 3
  // letters before =X.
  const m = /^([A-Z]{3})([A-Z]{3})=X$/.exec(symbol);
  if (m) return m[2];
  return 'USD';
}

// --- LRU + TTL cache -------------------------------------------------------

interface SearchCacheEntry {
  results: TickerResult[];
  expiresAt: number;
}

const SEARCH_CACHE_CAP = 50;
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const searchCache = new Map<string, SearchCacheEntry>();

function readSearchCache(key: string): TickerResult[] | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    searchCache.delete(key);
    return null;
  }
  // LRU touch: re-insert to move to the end
  searchCache.delete(key);
  searchCache.set(key, entry);
  return entry.results;
}

function writeSearchCache(key: string, results: TickerResult[]): void {
  if (searchCache.has(key)) searchCache.delete(key);
  searchCache.set(key, {
    results,
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
  });
  while (searchCache.size > SEARCH_CACHE_CAP) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey === undefined) break;
    searchCache.delete(oldestKey);
  }
}

/**
 * Search for tickers via the Kerdos quote-relay Worker (/search?type=auto).
 *
 * - Returns [] on any failure (caller is expected to fall back to the local
 *   dictionary). Never throws.
 * - 2-second timeout. Aborts in-flight requests instead of blocking the UI.
 * - Results are LRU cached in memory (cap 50, TTL 5 min) to avoid hitting the
 *   relay on every keystroke for the same query.
 */
export async function searchTickers(query: string): Promise<TickerResult[]> {
  const q = query.trim();
  if (q.length === 0) return [];

  const cacheKey = q.toLowerCase();
  const cached = readSearchCache(cacheKey);
  if (cached) return cached;

  const base = getRelayBaseUrl();
  if (!base) return [];

  const url = `${base}/search?type=auto&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(2000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      console.warn(`[priceService] searchTickers HTTP ${res.status} for "${q}"`);
      return [];
    }
    const data = (await res.json()) as WorkerSearchResponse;
    const entries = Array.isArray(data.results) ? data.results : [];
    const mapped: TickerResult[] = [];
    for (const entry of entries) {
      const r = mapWorkerEntry(entry);
      if (r) mapped.push(r);
    }
    writeSearchCache(cacheKey, mapped);
    return mapped;
  } catch (err) {
    console.warn(`[priceService] searchTickers failed for "${q}":`, err);
    return [];
  }
}

/** Cache TTL in milliseconds, keyed by AssetType. */
const CACHE_TTL: Record<string, number> = {
  us_stock: 15 * 60 * 1000,
  cn_stock: 15 * 60 * 1000,
  hk_stock: 15 * 60 * 1000,
  etf: 15 * 60 * 1000,
  crypto: 5 * 60 * 1000,
  forex: 60 * 60 * 1000,
  gold: 30 * 60 * 1000,
  silver: 30 * 60 * 1000,
  cash: 60 * 60 * 1000,
};

function getCacheTTL(type: AssetType): number {
  return CACHE_TTL[type] ?? 30 * 60 * 1000;
}

function cacheKey(type: AssetType, ticker: string): string {
  return `${type}:${ticker}`;
}

/**
 * Check Dexie priceCache for a non-expired entry.
 */
async function getCachedPrice(id: string): Promise<PriceResult | null> {
  const cached = await db.priceCache.get(id);
  if (!cached) return null;

  const now = new Date();
  if (cached.expiresAt <= now) {
    // Expired — delete it
    await db.priceCache.delete(id);
    return null;
  }

  return {
    ticker: cached.ticker,
    price: cached.price,
    currency: cached.currency,
    source: cached.source,
    timestamp: cached.fetchedAt,
  };
}

/**
 * Save a PriceResult into the Dexie priceCache.
 */
async function setCachedPrice(
  id: string,
  result: PriceResult,
  ttl: number,
): Promise<void> {
  const now = new Date();
  const entry: PriceCache = {
    id,
    ticker: result.ticker,
    price: result.price,
    currency: result.currency,
    source: result.source,
    fetchedAt: now,
    expiresAt: new Date(now.getTime() + ttl),
  };
  await db.priceCache.put(entry);
}

/**
 * Call the correct provider to fetch a live price.
 */
async function fetchFromProvider(
  type: AssetType,
  ticker: string,
): Promise<PriceResult> {
  switch (type as string) {
    case 'us_stock':
    case 'cn_stock':
    case 'hk_stock':
    case 'etf':
      return fetchYahooFinancePrice(ticker);

    case 'crypto':
      return fetchCoinGeckoPrice(ticker);

    case 'forex':
    case 'cash':
      return fetchExchangeRate(ticker);

    case 'gold':
      return fetchMetalPrice('XAU');

    case 'silver':
      return fetchMetalPrice('XAG');

    default:
      throw new Error(`No price provider for asset type "${type}"`);
  }
}

/**
 * Get a single price, checking cache first.
 * Returns null on error (never throws).
 */
export async function getPrice(asset: {
  type: AssetType;
  ticker?: string;
}): Promise<PriceResult | null> {
  const { type, ticker } = asset;
  if (!ticker) return null;

  const id = cacheKey(type, ticker);

  try {
    // Check cache
    const cached = await getCachedPrice(id);
    if (cached) return cached;

    // Fetch live
    const result = await fetchFromProvider(type, ticker);

    // Save to cache
    await setCachedPrice(id, result, getCacheTTL(type));

    return result;
  } catch (err) {
    console.error(`[priceService] Failed to get price for ${ticker} (${type}):`, err);
    return null;
  }
}

/**
 * Batch-fetch prices for multiple assets.
 * Groups by provider type and fetches in parallel.
 * Returns a Map keyed by ticker.
 */
export async function getPrices(
  assets: { type: AssetType; ticker?: string }[],
): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();

  // Filter out assets without tickers
  const fetchable = assets.filter(
    (a): a is { type: AssetType; ticker: string } => !!a.ticker,
  );

  // Deduplicate by cache key
  const uniqueMap = new Map<string, { type: AssetType; ticker: string }>();
  for (const a of fetchable) {
    const id = cacheKey(a.type, a.ticker);
    if (!uniqueMap.has(id)) {
      uniqueMap.set(id, a);
    }
  }

  // Fetch all in parallel
  const entries = Array.from(uniqueMap.values());
  const settled = await Promise.allSettled(entries.map((a) => getPrice(a)));

  for (let i = 0; i < entries.length; i++) {
    const outcome = settled[i];
    if (outcome.status === 'fulfilled' && outcome.value) {
      results.set(entries[i].ticker, outcome.value);
    }
  }

  return results;
}
