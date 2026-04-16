import type { AssetType } from '@/types/asset';
import type { PriceResult, PriceCache } from '@/types/price';
import { db } from '@/db';
import { fetchYahooFinancePrice } from './providers/yahooFinance';
import { fetchCoinGeckoPrice } from './providers/coinGecko';
import { fetchExchangeRate } from './providers/exchangeRate';
import { fetchMetalPrice } from './providers/metals';

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
