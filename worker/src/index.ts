/**
 * Kerdos 行情中继 Worker —— 入口。
 *
 * 路由：
 *   GET /price?type=...&ticker=...       单个标的价格
 *   GET /search?type=...&q=...           标的搜索（yahoo / coingecko）
 *   GET /benchmark?id=...&range=...      基准曲线
 *   GET /healthz                          健康检查
 *
 * 全局响应头：CORS * （Kerdos 是全本地浏览器应用，所有调用都跨域）
 *
 * 限流：每 IP 60 req/min（可通过环境变量 RATE_LIMIT_PER_MIN 调整）。
 *       KV 可用时存 KV，不可用时降级到进程内 Map。
 */

import { z } from 'zod';
import { Cache } from './cache';
import { getCacheTtlSeconds, inferMarketFromTicker, isMarketOpen } from './marketHours';
import { fetchCoinGeckoBenchmark, fetchCoinGeckoPrice, searchCoinGecko, tickerToCoinId } from './providers/coingecko';
import { fetchForex } from './providers/forex';
import { fetchStooqHistorical, fetchStooqPrice } from './providers/stooq';
import type { BenchmarkSeries, NormalizedPrice } from './providers/types';
import { fetchYahooHistorical, fetchYahooPrice, searchYahoo } from './providers/yahoo';

// ============================================================================
// 环境绑定
// ============================================================================
export interface Env {
  PRICE_CACHE?: KVNamespace;
  RATE_LIMIT?: KVNamespace;
  RATE_LIMIT_PER_MIN?: string;
  LOG_LEVEL?: string;
}

// ============================================================================
// CORS
// ============================================================================
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function errorResponse(message: string, status = 400, details?: unknown): Response {
  return jsonResponse({ error: message, details }, status);
}

// ============================================================================
// 限流 —— 固定窗口 60s，KV 优先，Map 兜底
// ============================================================================
const memoryRateMap = new Map<string, { count: number; resetAt: number }>();

async function rateLimit(env: Env, ip: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const limit = Number(env.RATE_LIMIT_PER_MIN ?? '60');
  const windowSec = 60;
  const now = Date.now();
  const windowKey = Math.floor(now / (windowSec * 1000));
  const key = `rl:${ip}:${windowKey}`;
  const resetAt = (windowKey + 1) * windowSec * 1000;

  // KV 路径
  if (env.RATE_LIMIT) {
    try {
      const raw = await env.RATE_LIMIT.get(key);
      const count = raw ? Number(raw) : 0;
      if (count >= limit) {
        return { allowed: false, remaining: 0, resetAt };
      }
      // KV 写入不是原子的；极端高并发下可能多放行 1-2 个请求，对 60 req/min 限流够用了。
      await env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: windowSec * 2 });
      return { allowed: true, remaining: Math.max(0, limit - count - 1), resetAt };
    } catch (err) {
      console.warn('[ratelimit] KV failed, falling back to memory:', err);
    }
  }

  // 内存兜底
  const entry = memoryRateMap.get(ip);
  if (!entry || entry.resetAt <= now) {
    memoryRateMap.set(ip, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

function getClientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'anonymous'
  );
}

// ============================================================================
// 对外响应结构
// ============================================================================
interface PriceResponse {
  ticker: string;
  price: number;
  currency: string;
  source: string;
  cachedAt: string; // ISO，Worker 缓存写入时间
  asOf: string;     // ISO，数据源声称的报价时间
  stale: boolean;   // 如果是 stale 兜底或源全部失败取旧值 → true
}

// ============================================================================
// Price handler
// ============================================================================
const priceQuerySchema = z.object({
  type: z.enum([
    'us_stock',
    'cn_stock',
    'hk_stock',
    'etf',
    'crypto',
    'forex',
    'cash',
    'gold',
    'silver',
  ]),
  ticker: z.string().min(1).max(32),
});

async function fetchPriceFromProvider(
  type: string,
  ticker: string,
): Promise<NormalizedPrice> {
  switch (type) {
    case 'us_stock':
    case 'cn_stock':
    case 'hk_stock':
    case 'etf': {
      try {
        return await fetchYahooPrice(ticker);
      } catch (err) {
        console.warn(`[price] yahoo failed for ${ticker}, trying stooq:`, err);
        return await fetchStooqPrice(ticker);
      }
    }
    case 'crypto':
      return await fetchCoinGeckoPrice(ticker);
    case 'forex':
    case 'cash':
      return await fetchForex(ticker);
    case 'gold':
    case 'silver': {
      // 贵金属：Yahoo 有 XAUUSD=X / XAGUSD=X，降级到 Stooq 的 xauusd / xagusd
      const symbol = type === 'gold' ? 'XAUUSD=X' : 'XAGUSD=X';
      try {
        return await fetchYahooPrice(symbol);
      } catch (err) {
        console.warn(`[price] yahoo metals failed for ${symbol}:`, err);
        const stooqSym = type === 'gold' ? 'xauusd' : 'xagusd';
        return await fetchStooqPrice(stooqSym);
      }
    }
    default:
      throw new Error(`unsupported type: ${type}`);
  }
}

async function handlePrice(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const parsed = priceQuerySchema.safeParse({
    type: url.searchParams.get('type'),
    ticker: url.searchParams.get('ticker'),
  });
  if (!parsed.success) {
    return errorResponse('invalid query', 400, parsed.error.flatten());
  }
  const { type, ticker } = parsed.data;

  const cache = new Cache(env.PRICE_CACHE);
  const cacheKey = `price:${type}:${ticker.toUpperCase()}`;
  const market = inferMarketFromTicker(type, ticker);
  const freshTtl = getCacheTtlSeconds(market);

  // 1) 查缓存
  const cacheRead = await cache.read<NormalizedPrice>(cacheKey);

  if (cacheRead.status === 'fresh' && cacheRead.entry) {
    console.log(`[price] cache fresh hit: ${cacheKey} source=${cacheRead.entry.value.source}`);
    return jsonResponse(toPriceResponse(cacheRead.entry.value, cacheRead.entry.cachedAt, false));
  }

  // 2) 缓存 stale 或 miss → 尝试拉源
  try {
    const fresh = await fetchPriceFromProvider(type, ticker);
    await cache.write(cacheKey, fresh, freshTtl);
    console.log(
      `[price] fetched fresh: ${cacheKey} source=${fresh.source} marketOpen=${isMarketOpen(market)}`,
    );
    return jsonResponse(toPriceResponse(fresh, new Date().toISOString(), false));
  } catch (err) {
    console.error(`[price] all providers failed for ${cacheKey}:`, err);

    // 3) 源全部失败 → 尝试返回 stale 缓存
    if (cacheRead.entry) {
      console.warn(`[price] returning stale cache for ${cacheKey}`);
      return jsonResponse(
        toPriceResponse(cacheRead.entry.value, cacheRead.entry.cachedAt, true),
        200,
        { 'X-Kerdos-Stale-Reason': 'provider-failure' },
      );
    }

    // 4) 连兜底都没有 → 500（前端会捕获并走 manualPrice 逻辑）
    return errorResponse(
      `upstream providers failed and no cache available`,
      502,
      err instanceof Error ? err.message : String(err),
    );
  }
}

function toPriceResponse(p: NormalizedPrice, cachedAt: string, stale: boolean): PriceResponse {
  return {
    ticker: p.ticker,
    price: p.price,
    currency: p.currency,
    source: p.source,
    cachedAt,
    asOf: p.asOf,
    stale,
  };
}

// ============================================================================
// Search handler
// ============================================================================
const searchQuerySchema = z.object({
  type: z.enum(['stock', 'crypto', 'auto']),
  q: z.string().min(1).max(64),
});

/**
 * auto 模式：并行打 Yahoo + CoinGecko，合并去重后按相关性粗略排序。
 * 任一 provider 挂了不影响另一个的结果。
 */
async function searchAuto(q: string): Promise<Array<{
  ticker: string;
  name: string;
  exchange?: string;
  type?: string;
  source: 'yahoo' | 'coingecko';
}>> {
  const [yahooSettled, cgSettled] = await Promise.allSettled([
    searchYahoo(q),
    searchCoinGecko(q),
  ]);

  const merged: Array<{
    ticker: string;
    name: string;
    exchange?: string;
    type?: string;
    source: 'yahoo' | 'coingecko';
  }> = [];
  const seen = new Set<string>();

  function push(entry: { ticker: string; name: string; exchange?: string; type?: string; source: 'yahoo' | 'coingecko' }): void {
    const key = `${entry.source}:${entry.ticker.toUpperCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(entry);
  }

  if (yahooSettled.status === 'fulfilled') {
    for (const r of yahooSettled.value) push(r);
  } else {
    console.warn('[search:auto] yahoo leg failed:', yahooSettled.reason);
  }
  if (cgSettled.status === 'fulfilled') {
    for (const r of cgSettled.value) push(r);
  } else {
    console.warn('[search:auto] coingecko leg failed:', cgSettled.reason);
  }

  // 粗略相关性排序：ticker 精确匹配 > ticker 前缀 > name 包含
  const qLower = q.toLowerCase();
  merged.sort((a, b) => score(b, qLower) - score(a, qLower));
  return merged.slice(0, 20);
}

function score(
  entry: { ticker: string; name: string },
  qLower: string,
): number {
  const t = entry.ticker.toLowerCase();
  const n = entry.name.toLowerCase();
  if (t === qLower) return 100;
  if (t.startsWith(qLower)) return 80;
  if (n.startsWith(qLower)) return 60;
  if (t.includes(qLower)) return 40;
  if (n.includes(qLower)) return 20;
  return 0;
}

async function handleSearch(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const parsed = searchQuerySchema.safeParse({
    type: url.searchParams.get('type'),
    q: url.searchParams.get('q'),
  });
  if (!parsed.success) {
    return errorResponse('invalid query', 400, parsed.error.flatten());
  }
  const { type, q } = parsed.data;

  const cache = new Cache(env.PRICE_CACHE);
  const cacheKey = `search:${type}:${q.toLowerCase()}`;

  const cacheRead = await cache.read<unknown>(cacheKey);
  if (cacheRead.status === 'fresh' && cacheRead.entry) {
    return jsonResponse({ results: cacheRead.entry.value, cached: true });
  }

  try {
    let results;
    if (type === 'auto') {
      results = await searchAuto(q);
    } else if (type === 'crypto') {
      results = await searchCoinGecko(q);
    } else {
      results = await searchYahoo(q);
    }
    // 搜索结果变化慢，缓存 10 分钟 fresh + 1 小时 stale
    await cache.write(cacheKey, results, 600);
    console.log(`[search] ${type} q=${q} → ${results.length} results`);
    return jsonResponse({ results, cached: false });
  } catch (err) {
    console.error(`[search] failed:`, err);
    if (cacheRead.entry) {
      return jsonResponse({ results: cacheRead.entry.value, cached: true, stale: true });
    }
    return errorResponse('search failed', 502, err instanceof Error ? err.message : String(err));
  }
}

// ============================================================================
// Benchmark handler
// ============================================================================
const benchmarkQuerySchema = z.object({
  id: z.enum(['sp500', 'csi300', 'btc']),
  range: z.enum(['1m', '3m', '1y', 'all']),
});

function rangeToDays(range: '1m' | '3m' | '1y' | 'all'): number {
  switch (range) {
    case '1m':
      return 30;
    case '3m':
      return 90;
    case '1y':
      return 365;
    case 'all':
      return 365 * 10; // 10 年当作 all
  }
}

async function fetchBenchmark(
  id: 'sp500' | 'csi300' | 'btc',
  days: number,
): Promise<BenchmarkSeries> {
  switch (id) {
    case 'sp500':
      // Yahoo chart 1st (Stooq historical 2026 起需 apikey，不稳定); Stooq 作备用
      try {
        return await fetchYahooHistorical('^GSPC', days);
      } catch (err) {
        console.warn('[benchmark] yahoo sp500 failed, try stooq:', err);
        return await fetchStooqHistorical('^spx', days);
      }
    case 'csi300':
      try {
        return await fetchYahooHistorical('000300.SS', days);
      } catch (err) {
        console.warn('[benchmark] yahoo csi300 failed, try stooq:', err);
        return await fetchStooqHistorical('000300.ss', days);
      }
    case 'btc': {
      // CoinGecko 的 days 参数直接支持
      const coinId = tickerToCoinId('BTC') ?? 'bitcoin';
      return await fetchCoinGeckoBenchmark(coinId, days);
    }
  }
}

async function handleBenchmark(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const parsed = benchmarkQuerySchema.safeParse({
    id: url.searchParams.get('id'),
    range: url.searchParams.get('range'),
  });
  if (!parsed.success) {
    return errorResponse('invalid query', 400, parsed.error.flatten());
  }
  const { id, range } = parsed.data;
  const days = rangeToDays(range);

  const cache = new Cache(env.PRICE_CACHE);
  const cacheKey = `bench:${id}:${range}`;

  const cacheRead = await cache.read<BenchmarkSeries>(cacheKey);
  if (cacheRead.status === 'fresh' && cacheRead.entry) {
    console.log(`[benchmark] cache fresh: ${cacheKey}`);
    return jsonResponse({
      ...cacheRead.entry.value,
      cachedAt: cacheRead.entry.cachedAt,
      stale: false,
    });
  }

  try {
    const series = await fetchBenchmark(id, days);
    // 基准曲线变化慢：日线数据缓存 1 小时 fresh + 24 小时 stale
    await cache.write(cacheKey, series, 3600, 24 * 3600);
    console.log(`[benchmark] fetched ${id}/${range}: ${series.points.length} points`);
    return jsonResponse({ ...series, cachedAt: new Date().toISOString(), stale: false });
  } catch (err) {
    console.error(`[benchmark] failed:`, err);
    if (cacheRead.entry) {
      return jsonResponse(
        {
          ...cacheRead.entry.value,
          cachedAt: cacheRead.entry.cachedAt,
          stale: true,
        },
        200,
        { 'X-Kerdos-Stale-Reason': 'provider-failure' },
      );
    }
    return errorResponse('benchmark failed', 502, err instanceof Error ? err.message : String(err));
  }
}

// ============================================================================
// Worker 入口
// ============================================================================
export default {
  async fetch(req: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (req.method !== 'GET') {
      return errorResponse('method not allowed', 405);
    }

    const url = new URL(req.url);
    const path = url.pathname;

    // 健康检查不走限流
    if (path === '/healthz') {
      return jsonResponse({
        ok: true,
        name: 'kerdos-quote-relay',
        time: new Date().toISOString(),
        kv: {
          PRICE_CACHE: Boolean(env.PRICE_CACHE),
          RATE_LIMIT: Boolean(env.RATE_LIMIT),
        },
      });
    }

    // 限流
    const ip = getClientIp(req);
    const rl = await rateLimit(env, ip);
    if (!rl.allowed) {
      console.warn(`[ratelimit] ${ip} hit limit`);
      return jsonResponse(
        { error: 'rate limit exceeded', resetAt: new Date(rl.resetAt).toISOString() },
        429,
        {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(rl.resetAt / 1000)),
        },
      );
    }

    try {
      switch (path) {
        case '/price':
          return await handlePrice(req, env);
        case '/search':
          return await handleSearch(req, env);
        case '/benchmark':
          return await handleBenchmark(req, env);
        default:
          return errorResponse('not found', 404);
      }
    } catch (err) {
      // 兜底：handler 抛了未捕获异常
      console.error('[worker] unhandled error:', err);
      return errorResponse('internal error', 500, err instanceof Error ? err.message : String(err));
    }
  },
};
