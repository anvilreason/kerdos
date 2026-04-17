/**
 * CoinGecko 加密货币源。
 *
 * - 价格端点：/api/v3/simple/price
 * - 搜索端点：/api/v3/search?query=...
 * - 历史端点：/api/v3/coins/{id}/market_chart?vs_currency=usd&days=N
 *
 * 免费版限速 10-30 req/min。我们在 Worker 层做缓存，基本不会被 ban。
 * 如果后续发现频繁 429，需要考虑加 API Key 或降级到 CryptoCompare。
 */

import type { BenchmarkSeries, NormalizedPrice, SearchResult } from './types';
import { kerdosFetch } from './http';

const BASE = 'https://api.coingecko.com/api/v3';

/**
 * 常见 ticker → CoinGecko id 映射。搜索端点会兜底未知 ticker。
 */
const TICKER_TO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  SHIB: 'shiba-inu',
  UNI: 'uniswap',
  LTC: 'litecoin',
  ATOM: 'cosmos',
  XLM: 'stellar',
  NEAR: 'near',
  APT: 'aptos',
  SUI: 'sui',
  ARB: 'arbitrum',
  USDT: 'tether',
  USDC: 'usd-coin',
  TON: 'the-open-network',
  TRX: 'tron',
  OP: 'optimism',
};

export function tickerToCoinId(ticker: string): string | null {
  return TICKER_TO_ID[ticker.toUpperCase()] ?? null;
}

interface CgPriceResp {
  [id: string]: {
    usd?: number;
    last_updated_at?: number;
  };
}

export async function fetchCoinGeckoPrice(ticker: string): Promise<NormalizedPrice> {
  const id = tickerToCoinId(ticker);
  if (!id) {
    throw new Error(`coingecko: unknown ticker "${ticker}"; need to add to TICKER_TO_ID or use /search first`);
  }

  const url = `${BASE}/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd&include_last_updated_at=true`;
  const res = await kerdosFetch(url, { timeoutMs: 8000 });

  if (!res.ok) {
    throw new Error(`coingecko HTTP ${res.status} for ${id}`);
  }

  const data = (await res.json()) as CgPriceResp;
  const priceBlock = data[id];
  if (!priceBlock || priceBlock.usd == null) {
    throw new Error(`coingecko: no price for ${id}`);
  }

  const asOf = priceBlock.last_updated_at
    ? new Date(priceBlock.last_updated_at * 1000).toISOString()
    : new Date().toISOString();

  return {
    ticker: ticker.toUpperCase(),
    price: priceBlock.usd,
    currency: 'USD',
    source: 'coingecko',
    asOf,
  };
}

interface CgSearchResp {
  coins?: Array<{
    id: string;
    symbol: string;
    name: string;
    market_cap_rank?: number | null;
  }>;
}

export async function searchCoinGecko(query: string): Promise<SearchResult[]> {
  const url = `${BASE}/search?query=${encodeURIComponent(query)}`;
  const res = await kerdosFetch(url, { timeoutMs: 8000 });

  if (!res.ok) {
    throw new Error(`coingecko search HTTP ${res.status}`);
  }

  const data = (await res.json()) as CgSearchResp;
  const coins = data.coins ?? [];

  // 按市值排序，取前 10
  return coins
    .slice(0, 10)
    .map((c) => ({
      ticker: c.symbol.toUpperCase(),
      name: c.name,
      type: 'cryptocurrency',
      source: 'coingecko' as const,
    }));
}

interface CgMarketChartResp {
  prices?: Array<[number, number]>; // [timestamp_ms, price]
}

/**
 * 拉取基准曲线。BenchmarkRange 映射到 days 参数。
 */
export async function fetchCoinGeckoBenchmark(
  id: string,
  days: number,
): Promise<BenchmarkSeries> {
  const url = `${BASE}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`;
  const res = await kerdosFetch(url, { timeoutMs: 10000 });

  if (!res.ok) {
    throw new Error(`coingecko benchmark HTTP ${res.status}`);
  }

  const data = (await res.json()) as CgMarketChartResp;
  const prices = data.prices ?? [];

  return {
    id,
    name: id,
    currency: 'USD',
    source: 'coingecko',
    asOf: new Date().toISOString(),
    points: prices.map(([ts, v]) => ({ t: new Date(ts).toISOString(), v })),
  };
}
