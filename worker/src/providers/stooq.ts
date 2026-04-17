/**
 * Stooq —— Yahoo 的降级源。
 *
 * 特点：
 * - 端点返回 CSV（不是 JSON），需要手工解析
 * - 免费、无需 Key、全球股票 + 指数覆盖较全
 * - A 股后缀是 .SH / .SZ（不是 Yahoo 的 .SS）
 * - ETF / 指数可用：^spx（S&P500）、^ndq（Nasdaq）、^dji（Dow）
 *
 * 端点：https://stooq.com/q/l/?s=aapl.us&f=sd2t2ohlcv&h&e=csv
 *   s=symbol f=fields h=header e=csv
 */

import type { BenchmarkPoint, BenchmarkSeries, NormalizedPrice } from './types';
import { kerdosFetch } from './http';

const QUOTE_BASE = 'https://stooq.com/q/l/';
const HIST_BASE = 'https://stooq.com/q/d/l/';

/**
 * Yahoo ticker → Stooq ticker 转换。
 * - AAPL → aapl.us
 * - 600519.SS → 600519.sh
 * - 000001.SZ → 000001.sz
 * - 0700.HK → 0700.hk
 * - ^GSPC → ^spx
 */
export function yahooToStooqSymbol(yahooTicker: string): string {
  const t = yahooTicker.toLowerCase();
  if (t.endsWith('.ss')) return t.replace('.ss', '.sh');
  if (t.endsWith('.sz') || t.endsWith('.hk')) return t;
  if (t.startsWith('^')) {
    // 常见指数映射
    const m: Record<string, string> = {
      '^gspc': '^spx',
      '^spx': '^spx',
      '^ndx': '^ndq',
      '^ixic': '^ndq',
      '^dji': '^dji',
      '000300.ss': '000300.sh',
    };
    return m[t] ?? t;
  }
  // 裸 ticker 默认按美股处理
  if (/^[a-z]+$/.test(t)) return `${t}.us`;
  return t;
}

/**
 * CSV 行：Symbol,Date,Time,Open,High,Low,Close,Volume
 */
function parseQuoteCsv(csv: string): {
  close: number;
  date: string;
  time: string;
} | null {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return null;
  const cols = lines[1].split(',');
  if (cols.length < 7) return null;
  const close = Number(cols[6]);
  if (!Number.isFinite(close) || close === 0) return null;
  return { close, date: cols[1], time: cols[2] };
}

export async function fetchStooqPrice(yahooTicker: string): Promise<NormalizedPrice> {
  const stooqSym = yahooToStooqSymbol(yahooTicker);
  const url = `${QUOTE_BASE}?s=${encodeURIComponent(stooqSym)}&f=sd2t2ohlcv&h&e=csv`;

  const res = await kerdosFetch(url, { timeoutMs: 8000 });
  if (!res.ok) {
    throw new Error(`stooq HTTP ${res.status} for ${stooqSym}`);
  }

  const csv = await res.text();
  const parsed = parseQuoteCsv(csv);
  if (!parsed) {
    throw new Error(`stooq: cannot parse CSV for ${stooqSym}`);
  }

  // Stooq 的时间是交易所本地时间，没有时区信息，这里简化成当前时间以免混淆。
  // 币种推断：.us = USD，.sh/.sz = CNY，.hk = HKD，其他默认 USD
  let currency = 'USD';
  if (stooqSym.endsWith('.sh') || stooqSym.endsWith('.sz')) currency = 'CNY';
  else if (stooqSym.endsWith('.hk')) currency = 'HKD';

  return {
    ticker: yahooTicker.toUpperCase(),
    price: parsed.close,
    currency,
    source: 'stooq',
    asOf: new Date().toISOString(),
  };
}

/**
 * Stooq 历史数据（d1 = 日线）。用于基准曲线。
 * days 参数：指定起止日期，默认取足够多以覆盖 "all"（约 10 年）。
 */
export async function fetchStooqHistorical(
  yahooTicker: string,
  days: number,
): Promise<BenchmarkSeries> {
  const stooqSym = yahooToStooqSymbol(yahooTicker);
  const now = new Date();
  const start = new Date(now.getTime() - days * 24 * 3600 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const url = `${HIST_BASE}?s=${encodeURIComponent(stooqSym)}&i=d&d1=${fmt(start)}&d2=${fmt(now)}`;

  const res = await kerdosFetch(url, { timeoutMs: 15000 });
  if (!res.ok) {
    throw new Error(`stooq hist HTTP ${res.status} for ${stooqSym}`);
  }

  const csv = await res.text();
  const lines = csv.trim().split('\n');
  // header: Date,Open,High,Low,Close,Volume
  const points: BenchmarkPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 5) continue;
    const close = Number(cols[4]);
    if (!Number.isFinite(close) || close === 0) continue;
    points.push({ t: new Date(`${cols[0]}T00:00:00Z`).toISOString(), v: close });
  }

  if (points.length === 0) {
    throw new Error(`stooq hist: no parseable points for ${stooqSym}`);
  }

  let currency = 'USD';
  if (stooqSym.endsWith('.sh') || stooqSym.endsWith('.sz')) currency = 'CNY';
  else if (stooqSym.endsWith('.hk')) currency = 'HKD';

  return {
    id: yahooTicker,
    name: yahooTicker,
    currency,
    source: 'stooq',
    asOf: new Date().toISOString(),
    points,
  };
}
