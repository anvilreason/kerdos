/**
 * Currency conversion utility.
 *
 * Two-layer strategy (post-UX-feedback 2026-04-17):
 *   1. Live rates — populated at runtime by `useFxRates()` hook via
 *      `setLiveRates()`. Source: open.er-api.com (CORS-enabled, free).
 *   2. Hardcoded fallback — used when live rates haven't loaded yet or
 *      the upstream is unreachable. Values are an approximate 2026 Q1
 *      snapshot; good enough to not embarrass us before live rates land.
 *
 * All rates are expressed as **per 1 unit of that currency, in USD**.
 * So `RATES_TO_USD["CNY"] = 0.137` means 1 CNY ≈ 0.137 USD.
 */

/**
 * Hardcoded approximate rates (Q1 2026). Expanded from the original 5
 * to cover the main currencies users are likely to hold. Do NOT treat
 * these as trading rates — they exist purely to avoid NaN in the UI
 * during the first 500ms before `useFxRates` populates live values.
 */
const FALLBACK_RATES_TO_USD: Readonly<Record<string, number>> = {
  USD: 1,
  CNY: 0.137,
  HKD: 0.128,
  TWD: 0.031,
  JPY: 0.0067,
  KRW: 0.00073,
  EUR: 1.08,
  GBP: 1.25,
  CHF: 1.12,
  SGD: 0.74,
  AUD: 0.66,
  CAD: 0.73,
  INR: 0.012,
  THB: 0.028,
  MYR: 0.22,
  IDR: 0.000063,
  RUB: 0.011,
  BRL: 0.20,
  MXN: 0.059,
  ZAR: 0.054,
  TRY: 0.029,
  SEK: 0.095,
  NOK: 0.094,
  DKK: 0.145,
  PLN: 0.25,
  NZD: 0.60,
  AED: 0.272,
  SAR: 0.267,
};

/**
 * Live rates table. Mutated by `setLiveRates` at runtime. Starts as a
 * shallow copy of the fallback so reads always succeed.
 */
let liveRates: Record<string, number> = { ...FALLBACK_RATES_TO_USD };

/**
 * Replace the live FX table. Typically called by `useFxRates` after a
 * successful fetch from open.er-api.com. Unknown currencies in `next`
 * are merged in; missing ones keep their previous value.
 */
export function setLiveRates(next: Record<string, number>): void {
  liveRates = { ...liveRates, ...next };
}

/**
 * Convert `amount` from `from` currency to `to` currency.
 *
 * Strategy: from → USD → to, using live rates if present, otherwise
 * fallback. Unknown currency codes bypass conversion (log warn, return
 * input) so the UI never shows NaN.
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
): number {
  if (from === to) return amount;

  const f = from.toUpperCase();
  const t = to.toUpperCase();
  const fromRate = liveRates[f] ?? FALLBACK_RATES_TO_USD[f];
  const toRate = liveRates[t] ?? FALLBACK_RATES_TO_USD[t];

  if (fromRate == null || toRate == null) {
    console.warn(
      `[currency] Unknown conversion pair: ${from} -> ${to}; returning raw amount`,
    );
    return amount;
  }

  const inUsd = amount * fromRate;
  return inUsd / toRate;
}

/**
 * Symbol table — display-only, not used for conversion.
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    CNY: "\u00A5",
    HKD: "HK$",
    TWD: "NT$",
    JPY: "\u00A5",
    KRW: "\u20A9",
    EUR: "\u20AC",
    GBP: "\u00A3",
    CHF: "Fr",
    SGD: "S$",
    AUD: "A$",
    CAD: "C$",
    INR: "\u20B9",
    RUB: "\u20BD",
    BRL: "R$",
  };
  return symbols[currency.toUpperCase()] ?? currency;
}

/**
 * Expose the full list of supported currency codes for dropdowns etc.
 * Order reflects "most common first" based on Kerdos's target audience.
 */
export const SUPPORTED_CURRENCIES: readonly string[] = [
  "USD",
  "CNY",
  "HKD",
  "EUR",
  "GBP",
  "JPY",
  "KRW",
  "TWD",
  "SGD",
  "AUD",
  "CAD",
  "CHF",
  "INR",
];
