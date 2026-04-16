import type { PriceResult } from '@/types/price';

interface ExchangeRateResponse {
  result: string;
  base_code: string;
  rates: Record<string, number>;
}

/**
 * Fetch forex rate for a currency pair relative to USD.
 * @param base - The base currency code, e.g. "CNY", "EUR", "GBP"
 * @returns PriceResult where price = how many units of base per 1 USD
 */
export async function fetchExchangeRate(base: string): Promise<PriceResult> {
  const baseCurrency = base.toUpperCase();
  const url = `https://open.er-api.com/v6/latest/${baseCurrency}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

  if (!res.ok) {
    throw new Error(`ExchangeRate API HTTP ${res.status} for ${baseCurrency}`);
  }

  const data: ExchangeRateResponse = await res.json();

  if (data.result !== 'success') {
    throw new Error(`ExchangeRate API error for ${baseCurrency}: result=${data.result}`);
  }

  const usdRate = data.rates['USD'];
  if (usdRate == null) {
    throw new Error(`ExchangeRate API: no USD rate for ${baseCurrency}`);
  }

  return {
    ticker: baseCurrency,
    price: usdRate,
    currency: 'USD',
    source: 'exchange_rate_api',
    timestamp: new Date(),
  };
}
