import type { PriceResult } from '@/types/price';

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice: number;
        currency: string;
        symbol: string;
      };
    }> | null;
    error: { code: string; description: string } | null;
  };
}

async function fetchWithCorsProxy(url: string): Promise<Response> {
  // Try direct first
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) return res;
  } catch {
    // Direct failed — fall through to proxy
  }

  // Fallback to CORS proxy
  const proxiedUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
  return fetch(proxiedUrl, { signal: AbortSignal.timeout(10000) });
}

export async function fetchYahooFinancePrice(ticker: string): Promise<PriceResult> {
  const url = `${YAHOO_BASE}/${encodeURIComponent(ticker)}?range=1d&interval=1d`;
  const res = await fetchWithCorsProxy(url);

  if (!res.ok) {
    throw new Error(`Yahoo Finance HTTP ${res.status} for ${ticker}`);
  }

  const data: YahooChartResponse = await res.json();

  if (data.chart.error) {
    throw new Error(`Yahoo Finance error for ${ticker}: ${data.chart.error.description}`);
  }

  const result = data.chart.result?.[0];
  if (!result) {
    throw new Error(`Yahoo Finance: no data for ${ticker}`);
  }

  return {
    ticker,
    price: result.meta.regularMarketPrice,
    currency: result.meta.currency ?? 'USD',
    source: 'yahoo_finance',
    timestamp: new Date(),
  };
}
