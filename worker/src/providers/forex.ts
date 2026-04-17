/**
 * 外汇源 —— ExchangeRate-API（主）+ Frankfurter（降级）。
 *
 * ExchangeRate-API (open.er-api.com):
 *   - 免费，无需 Key
 *   - 端点：/v6/latest/{BASE}
 *
 * Frankfurter (frankfurter.app):
 *   - 欧洲央行数据，免费
 *   - 端点：/latest?from={BASE}&to={TARGET}
 *   - 仅工作日更新
 *
 * 约定：传入的 ticker 是单个币种代码（CNY / EUR / JPY），
 *      返回的 price = 1 单位该币种值多少 USD。
 *      例如 fetchForex("CNY") → price = 0.138（意味着 1 CNY ≈ 0.138 USD）
 *
 *      这和前端 exchangeRate.ts 的语义是一致的（price 单位 USD）。
 */

import type { NormalizedPrice } from './types';
import { kerdosFetch } from './http';

interface ExchangeRateResp {
  result: string;
  base_code: string;
  rates: Record<string, number>;
  time_last_update_unix?: number;
}

export async function fetchExchangeRateApi(base: string): Promise<NormalizedPrice> {
  const b = base.toUpperCase();
  if (b === 'USD') {
    // 特殊：USD → USD 永远是 1
    return {
      ticker: 'USD',
      price: 1,
      currency: 'USD',
      source: 'exchangerate',
      asOf: new Date().toISOString(),
    };
  }

  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(b)}`;
  const res = await kerdosFetch(url, { timeoutMs: 8000 });
  if (!res.ok) {
    throw new Error(`exchangerate HTTP ${res.status} for ${b}`);
  }

  const data = (await res.json()) as ExchangeRateResp;
  if (data.result !== 'success') {
    throw new Error(`exchangerate result=${data.result} for ${b}`);
  }

  const usdRate = data.rates['USD'];
  if (usdRate == null) {
    throw new Error(`exchangerate: no USD rate for ${b}`);
  }

  const asOf = data.time_last_update_unix
    ? new Date(data.time_last_update_unix * 1000).toISOString()
    : new Date().toISOString();

  return {
    ticker: b,
    price: usdRate,
    currency: 'USD',
    source: 'exchangerate',
    asOf,
  };
}

interface FrankfurterResp {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

export async function fetchFrankfurter(base: string): Promise<NormalizedPrice> {
  const b = base.toUpperCase();
  if (b === 'USD') {
    return {
      ticker: 'USD',
      price: 1,
      currency: 'USD',
      source: 'frankfurter',
      asOf: new Date().toISOString(),
    };
  }

  const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(b)}&to=USD`;
  const res = await kerdosFetch(url, { timeoutMs: 8000 });
  if (!res.ok) {
    throw new Error(`frankfurter HTTP ${res.status} for ${b}`);
  }

  const data = (await res.json()) as FrankfurterResp;
  const rate = data.rates?.USD;
  if (rate == null) {
    throw new Error(`frankfurter: no USD rate for ${b}`);
  }

  return {
    ticker: b,
    price: rate,
    currency: 'USD',
    source: 'frankfurter',
    asOf: new Date(`${data.date}T00:00:00Z`).toISOString(),
  };
}

/**
 * 降级链：ExchangeRate-API → Frankfurter。两者都失败才抛。
 */
export async function fetchForex(base: string): Promise<NormalizedPrice> {
  try {
    return await fetchExchangeRateApi(base);
  } catch (err) {
    console.warn('[forex] exchangerate failed, trying frankfurter:', err);
    return await fetchFrankfurter(base);
  }
}
