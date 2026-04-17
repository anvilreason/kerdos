/**
 * Provider 层统一的返回结构。
 * 注意：这里的 NormalizedPrice 是 Worker 内部结构，对外的 API 响应会再包一层加上 cachedAt/stale。
 */

export interface NormalizedPrice {
  ticker: string;
  price: number;
  currency: string;
  source: string; // yahoo | coingecko | stooq | exchangerate | frankfurter | fallback
  asOf: string; // ISO, 数据源给出的报价时间（非缓存时间）
}

export interface SearchResult {
  ticker: string;
  name: string;
  exchange?: string;
  type?: string;
  source: 'yahoo' | 'coingecko';
}

export interface BenchmarkPoint {
  t: string; // ISO date
  v: number; // close price
}

export interface BenchmarkSeries {
  id: string;
  name: string;
  currency: string;
  points: BenchmarkPoint[];
  source: string;
  asOf: string;
}
