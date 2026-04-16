import type { PriceResult } from '@/types/price';

interface MetalPriceResponse {
  success: boolean;
  rates: Record<string, number>;
}

/**
 * Hardcoded fallback prices (per troy oz in USD).
 * Used when the API is unreachable or returns errors.
 */
const FALLBACK_PRICES: Record<string, number> = {
  XAU: 2350,
  XAG: 28.5,
};

/**
 * Fetch gold/silver prices from Metal Price API.
 * Falls back to hardcoded recent prices if the API fails.
 */
export async function fetchMetalPrice(
  metal: 'XAU' | 'XAG',
): Promise<PriceResult & { isFallback?: boolean }> {
  try {
    const url = `https://api.metalpriceapi.com/v1/latest?api_key=demo&base=USD&currencies=${metal}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!res.ok) {
      throw new Error(`MetalPrice API HTTP ${res.status}`);
    }

    const data: MetalPriceResponse = await res.json();

    if (!data.success) {
      throw new Error('MetalPrice API returned success=false');
    }

    const rate = data.rates[metal];
    if (rate == null || rate === 0) {
      throw new Error(`MetalPrice API: no rate for ${metal}`);
    }

    // The API returns rates as USD-per-unit-of-metal expressed inversely,
    // i.e. rates.XAU = 1/goldPriceInUSD. So price = 1/rate.
    const priceInUsd = 1 / rate;

    return {
      ticker: metal,
      price: priceInUsd,
      currency: 'USD',
      source: 'metal_price_api',
      timestamp: new Date(),
    };
  } catch (err) {
    const fallback = FALLBACK_PRICES[metal];
    if (fallback == null) {
      throw err;
    }

    console.warn(
      `[metals] API failed for ${metal}, using fallback price $${fallback}:`,
      err instanceof Error ? err.message : err,
    );

    return {
      ticker: metal,
      price: fallback,
      currency: 'USD',
      source: 'fallback',
      timestamp: new Date(),
      isFallback: true,
    };
  }
}
