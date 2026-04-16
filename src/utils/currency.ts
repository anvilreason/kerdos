/**
 * Hardcoded conversion rates for MVP.
 * All rates are relative to USD.
 */
const RATES_TO_USD: Record<string, number> = {
  USD: 1,
  CNY: 0.137,
  EUR: 1.08,
  GBP: 1.25,
  JPY: 0.0067,
};

/**
 * Convert an amount from one currency to another using hardcoded rates.
 * Real API-based conversion comes in Phase 2.
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
): number {
  if (from === to) return amount;

  const fromRate = RATES_TO_USD[from];
  const toRate = RATES_TO_USD[to];

  if (fromRate === undefined || toRate === undefined) {
    // Unknown currency pair -- return amount unchanged
    console.warn(
      `[currency] Unknown conversion pair: ${from} -> ${to}, returning original amount`,
    );
    return amount;
  }

  // Convert: from -> USD -> to
  const usdAmount = amount * fromRate;
  return usdAmount / toRate;
}

/**
 * Get the symbol for a currency code.
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    CNY: "\u00A5",
    EUR: "\u20AC",
    GBP: "\u00A3",
    JPY: "\u00A5",
  };
  return symbols[currency] ?? currency;
}
