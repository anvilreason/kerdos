import type { PriceResult } from '@/types/price';

/**
 * Mapping of common crypto tickers to CoinGecko IDs.
 * Top 20 by market cap + common stablecoins.
 */
const TICKER_TO_COINGECKO_ID: Record<string, string> = {
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
};

export function tickerToCoinGeckoId(ticker: string): string | null {
  return TICKER_TO_COINGECKO_ID[ticker.toUpperCase()] ?? null;
}

interface CoinGeckoPriceResponse {
  [id: string]: {
    usd: number;
  };
}

export async function fetchCoinGeckoPrice(ticker: string): Promise<PriceResult> {
  const id = tickerToCoinGeckoId(ticker);
  if (!id) {
    throw new Error(`CoinGecko: unknown ticker "${ticker}". Add it to TICKER_TO_COINGECKO_ID.`);
  }

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

  if (!res.ok) {
    throw new Error(`CoinGecko HTTP ${res.status} for ${ticker}`);
  }

  const data: CoinGeckoPriceResponse = await res.json();
  const priceData = data[id];
  if (!priceData) {
    throw new Error(`CoinGecko: no price data for ${ticker} (id: ${id})`);
  }

  return {
    ticker: ticker.toUpperCase(),
    price: priceData.usd,
    currency: 'USD',
    source: 'coingecko',
    timestamp: new Date(),
  };
}
