/**
 * Yahoo Finance 价格源（股票 + ETF）。
 *
 * 支持：
 * - 美股：AAPL、SPY
 * - A股：600519.SS（上交所）、000001.SZ（深交所）
 * - 港股：0700.HK
 *
 * 端点：query1.finance.yahoo.com/v8/finance/chart —— 无需 API Key，Worker 直连无 CORS 问题。
 * 搜索端点：query2.finance.yahoo.com/v1/finance/search
 *
 * 注意：Yahoo 未公开文档，字段结构以实际返回为准，做了防御性解析。
 */

import type { BenchmarkSeries, NormalizedPrice, SearchResult } from './types';
import { kerdosFetch } from './http';

const CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const SEARCH_BASE = 'https://query2.finance.yahoo.com/v1/finance/search';

interface YahooChartResponse {
  chart: {
    result:
      | Array<{
          meta: {
            regularMarketPrice?: number;
            chartPreviousClose?: number;
            previousClose?: number;
            currency?: string;
            symbol?: string;
            regularMarketTime?: number;
            exchangeName?: string;
          };
          timestamp?: number[];
          indicators?: {
            quote?: Array<{
              close?: (number | null)[];
            }>;
          };
        }>
      | null;
    error: { code: string; description: string } | null;
  };
}

interface YahooSearchResponse {
  quotes?: Array<{
    symbol: string;
    shortname?: string;
    longname?: string;
    exchDisp?: string;
    typeDisp?: string;
    quoteType?: string;
  }>;
}

/**
 * 归一化 ticker：
 * - 用户可能输入 "600519" （裸 A 股代码）→ 自动加 .SS
 * - "000001" → .SZ
 * - "300750" → .SZ（创业板）
 * - 其他不动
 */
export function normalizeYahooTicker(raw: string): string {
  const t = raw.trim().toUpperCase();
  if (/^\d{6}$/.test(t)) {
    // 6 位纯数字：6 开头上交所，其余深交所
    return t.startsWith('6') ? `${t}.SS` : `${t}.SZ`;
  }
  return t;
}

export async function fetchYahooPrice(ticker: string): Promise<NormalizedPrice> {
  const normalized = normalizeYahooTicker(ticker);
  const url = `${CHART_BASE}/${encodeURIComponent(normalized)}?range=1d&interval=1m`;

  const res = await kerdosFetch(url, { timeoutMs: 8000 });

  if (!res.ok) {
    throw new Error(`yahoo HTTP ${res.status} for ${normalized}`);
  }

  const data = (await res.json()) as YahooChartResponse;

  if (data.chart.error) {
    throw new Error(`yahoo error: ${data.chart.error.description}`);
  }

  const result = data.chart.result?.[0];
  if (!result) {
    throw new Error(`yahoo: no result for ${normalized}`);
  }

  // 优先用 meta.regularMarketPrice；没有就用 indicators 最后一个非 null close
  let price = result.meta.regularMarketPrice;
  if (price == null && result.indicators?.quote?.[0]?.close) {
    const closes = result.indicators.quote[0].close;
    for (let i = closes.length - 1; i >= 0; i--) {
      const c = closes[i];
      if (c != null) {
        price = c;
        break;
      }
    }
  }

  if (price == null || Number.isNaN(price)) {
    throw new Error(`yahoo: no price in response for ${normalized}`);
  }

  const asOf = result.meta.regularMarketTime
    ? new Date(result.meta.regularMarketTime * 1000).toISOString()
    : new Date().toISOString();

  return {
    ticker: normalized,
    price,
    currency: result.meta.currency ?? 'USD',
    source: 'yahoo',
    asOf,
  };
}

/**
 * Yahoo chart-based historical series for benchmarks (sp500, csi300, etc).
 * Added 2026-04-17 after Stooq historical endpoint started requiring apikey.
 *
 * Yahoo accepts a `range` string: 1mo | 3mo | 6mo | 1y | 2y | 5y | 10y | max.
 * We pick the smallest range that covers the requested day count.
 */
export async function fetchYahooHistorical(
  symbol: string,
  days: number,
): Promise<BenchmarkSeries> {
  const range =
    days <= 32 ? '1mo' :
    days <= 95 ? '3mo' :
    days <= 190 ? '6mo' :
    days <= 370 ? '1y' :
    days <= 740 ? '2y' :
    '5y';
  const url = `${CHART_BASE}/${encodeURIComponent(symbol)}?range=${range}&interval=1d`;
  const res = await kerdosFetch(url, { timeoutMs: 10000 });
  if (!res.ok) {
    throw new Error(`yahoo hist HTTP ${res.status} for ${symbol}`);
  }
  const data = (await res.json()) as YahooChartResponse;
  if (data.chart.error) {
    throw new Error(`yahoo hist error: ${data.chart.error.description}`);
  }
  const result = data.chart.result?.[0];
  if (!result || !result.timestamp || !result.indicators?.quote?.[0]?.close) {
    throw new Error(`yahoo hist: no parseable points for ${symbol}`);
  }
  const timestamps = result.timestamp;
  const closes = result.indicators.quote[0].close;
  const points = timestamps
    .map((t, i) => ({
      t: new Date(t * 1000).toISOString().slice(0, 10),
      v: closes[i],
    }))
    .filter((p): p is { t: string; v: number } => p.v != null && !Number.isNaN(p.v));
  if (points.length === 0) {
    throw new Error(`yahoo hist: all points null for ${symbol}`);
  }
  // Trim to requested window (Yahoo returns full range; we may want last N days)
  const trimmed = points.slice(-days);
  return {
    id: symbol,
    name: result.meta.symbol ?? symbol,
    currency: result.meta.currency ?? 'USD',
    points: trimmed,
    source: 'yahoo',
    asOf: trimmed[trimmed.length - 1].t,
  };
}

export async function searchYahoo(query: string): Promise<SearchResult[]> {
  const url = `${SEARCH_BASE}?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
  const res = await kerdosFetch(url, { timeoutMs: 8000 });

  if (!res.ok) {
    throw new Error(`yahoo search HTTP ${res.status}`);
  }

  const data = (await res.json()) as YahooSearchResponse;
  const quotes = data.quotes ?? [];

  return quotes
    .filter((q) => q.symbol)
    .map((q) => ({
      ticker: q.symbol,
      name: q.longname || q.shortname || q.symbol,
      exchange: q.exchDisp,
      type: q.quoteType || q.typeDisp,
      source: 'yahoo' as const,
    }));
}
