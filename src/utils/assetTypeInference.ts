import type { AssetType } from "@/types/asset";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface InferenceResult {
  type: AssetType;
  confidence: "high" | "medium" | "low";
  /**
   * Human-readable reasoning for the inferred type, in English short-phrase
   * form. Front-end may pass this through i18next (reason acts as a key) or
   * surface it verbatim as a tooltip.
   */
  reason: string;
}

// ---------------------------------------------------------------------------
// Rule-local constants
// ---------------------------------------------------------------------------

/**
 * Common crypto ticker symbols. Deliberately hard-coded (no network) so the
 * offline fallback path can classify bare tickers like "BTC" or "SOL".
 */
const CRYPTO_SYMBOLS: ReadonlySet<string> = new Set([
  "BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "TRX", "AVAX", "DOT",
  "MATIC", "LINK", "UNI", "ATOM", "LTC", "BCH", "ALGO", "XLM", "ETC", "NEAR",
  "APT", "FIL", "ICP", "HBAR", "VET", "SAND", "MANA", "AXS", "THETA", "EGLD",
  "FTM", "AAVE", "CRV", "MKR", "SNX", "COMP", "YFI", "SUSHI", "1INCH",
  "USDT", "USDC", "DAI", "BUSD", "TUSD",
]);

/**
 * Common stable-coin / crypto pair suffixes. When a symbol ends in one of
 * these and the prefix is itself a known crypto, we still classify as crypto
 * (e.g. BTCUSDT, ETHUSDC).
 */
const CRYPTO_PAIR_QUOTES: readonly string[] = [
  "USDT", "USDC", "USD", "BUSD", "DAI", "TUSD", "BTC", "ETH",
];

/** Precious-metal ISO-4217-like codes recognised by Yahoo/Metals.dev. */
const PRECIOUS_METALS: ReadonlySet<string> = new Set([
  "XAU", "XAG", "XPT", "XPD",
]);

/**
 * Major ISO-4217 currency codes. Used both for 3-letter single-code detection
 * and for the 6-letter forex-pair heuristic. Kept intentionally conservative
 * — we only list currencies that appear in common forex pairs.
 */
const ISO_CURRENCIES: ReadonlySet<string> = new Set([
  "USD", "EUR", "JPY", "GBP", "AUD", "CAD", "CHF", "CNY", "CNH", "HKD",
  "SGD", "KRW", "INR", "RUB", "BRL", "MXN", "ZAR", "TRY", "NZD", "SEK",
  "NOK", "DKK", "PLN",
]);

// ---------------------------------------------------------------------------
// Regex patterns
// ---------------------------------------------------------------------------

const RE_SSE_6 = /^6\d{5}$/;            // Shanghai main board
const RE_SZSE_MAIN = /^0\d{5}$/;         // Shenzhen main / SME board
const RE_CHINEXT = /^3\d{5}$/;           // ChiNext
const RE_SSE_B = /^9\d{5}$/;             // Shanghai B-shares
const RE_SSE_ETF = /^5\d{5}$/;           // Shanghai ETF/LOF (e.g. 510300)
const RE_SZSE_ETF = /^1[56]\d{4}$/;      // Shenzhen ETF (15/16 prefix)

const RE_HK_LIKE = /^0?\d{4,5}$/;        // 4-5 digit HK-style number
const RE_US_TICKER = /^[A-Z]{1,5}$/;     // Plain 1-5 letter US ticker
const RE_US_CLASS = /^[A-Z]+\.[A-Z]$/;   // Class-share notation, e.g. BRK.B
const RE_FOREX_PAIR = /^[A-Z]{3}[A-Z]{3}(=X)?$/;
const RE_FOREX_PAIR_CAPTURE = /^([A-Z]{3})([A-Z]{3})(=X)?$/;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Infer asset type from a ticker string alone — no network calls.
 *
 * Rules are evaluated top-to-bottom and the first match wins; there is no
 * probability-weighting. Callers can branch on `confidence` to decide whether
 * the guess is strong enough to auto-fill a form field.
 */
export function inferAssetType(ticker: string): InferenceResult {
  // 1. Empty / invalid --------------------------------------------------------
  if (!ticker || typeof ticker !== "string") {
    return { type: "other", confidence: "low", reason: "empty ticker" };
  }
  const raw = ticker.trim();
  if (raw.length === 0) {
    return { type: "other", confidence: "low", reason: "empty ticker" };
  }
  const sym = raw.toUpperCase();

  // 2. Explicit exchange suffixes (high confidence) --------------------------
  if (sym.endsWith(".SS") || sym.endsWith(".SH")) {
    return { type: "cn_stock", confidence: "high", reason: "Shanghai suffix (.SS/.SH)" };
  }
  if (sym.endsWith(".SZ")) {
    return { type: "cn_stock", confidence: "high", reason: "Shenzhen suffix (.SZ)" };
  }
  if (sym.endsWith(".HK")) {
    // AssetType has no dedicated hk_stock; we fold HK listings into us_stock
    // so the Yahoo price provider handles them (priceService.ts does the same
    // for Worker results). W2-03 marketHours already reads .HK off the ticker
    // to pick Hong Kong trading hours — that path is unaffected.
    return {
      type: "us_stock",
      confidence: "high",
      reason: "Hong Kong suffix (.HK), mapped to us_stock (no dedicated hk_stock type)",
    };
  }
  if (sym.endsWith(".L")) {
    return { type: "us_stock", confidence: "high", reason: "London suffix (.L)" };
  }
  if (sym.endsWith(".TO") || sym.endsWith(".V")) {
    return { type: "us_stock", confidence: "high", reason: "Toronto suffix (.TO/.V)" };
  }
  if (sym.endsWith(".T")) {
    return { type: "us_stock", confidence: "high", reason: "Tokyo suffix (.T)" };
  }

  // 3. A-share 6-digit codes (high confidence) -------------------------------
  // Order matters: ETF prefixes (5, 15/16) come before the broader
  // "starts-with-0" Shenzhen main-board rule to avoid mis-classification.
  if (RE_SSE_ETF.test(sym)) {
    return { type: "etf", confidence: "high", reason: "Shanghai ETF/LOF code (5xxxxx)" };
  }
  if (RE_SZSE_ETF.test(sym)) {
    return { type: "etf", confidence: "high", reason: "Shenzhen ETF code (15xxxx/16xxxx)" };
  }
  if (RE_SSE_6.test(sym)) {
    return { type: "cn_stock", confidence: "high", reason: "Shanghai A-share code (6xxxxx)" };
  }
  if (RE_SZSE_MAIN.test(sym)) {
    return { type: "cn_stock", confidence: "high", reason: "Shenzhen A-share code (0xxxxx)" };
  }
  if (RE_CHINEXT.test(sym)) {
    return { type: "cn_stock", confidence: "high", reason: "ChiNext code (3xxxxx)" };
  }
  if (RE_SSE_B.test(sym)) {
    return { type: "cn_stock", confidence: "high", reason: "Shanghai B-share code (9xxxxx)" };
  }

  // 4. Precious metals (high) ------------------------------------------------
  // Checked BEFORE forex so that XAUUSD / XAGUSD don't get caught by the
  // 6-letter forex-pair regex.
  if (PRECIOUS_METALS.has(sym)) {
    return { type: "gold", confidence: "high", reason: "Precious metal code" };
  }
  const metalStripped = sym.endsWith("=X") ? sym.slice(0, -2) : sym;
  if (metalStripped.length === 6 && PRECIOUS_METALS.has(metalStripped.slice(0, 3))) {
    // XAUUSD, XAUUSD=X, XAGUSD, ...
    return {
      type: "gold",
      confidence: "high",
      reason: "Precious metals pair (XAU/XAG/XPT/XPD vs currency)",
    };
  }

  // 5. Crypto — hard-coded list (high) ---------------------------------------
  if (CRYPTO_SYMBOLS.has(sym)) {
    return { type: "crypto", confidence: "high", reason: "Known cryptocurrency symbol" };
  }
  // 5b. Crypto pair like BTCUSDT / ETHUSDC — prefix is a known crypto and
  //     suffix is a known quote currency. Keep this BEFORE the forex-pair
  //     regex so "BTCUSDT" (7 chars, fails /^[A-Z]{3}[A-Z]{3}$/) and
  //     "ETHUSD" (6 chars, would match forex regex) both end up here.
  for (const quote of CRYPTO_PAIR_QUOTES) {
    if (sym.length > quote.length && sym.endsWith(quote)) {
      const base = sym.slice(0, sym.length - quote.length);
      if (CRYPTO_SYMBOLS.has(base)) {
        return {
          type: "crypto",
          confidence: "high",
          reason: `Crypto pair (${base}/${quote})`,
        };
      }
    }
  }

  // 6. Forex (medium) --------------------------------------------------------
  if (RE_FOREX_PAIR.test(sym)) {
    const m = RE_FOREX_PAIR_CAPTURE.exec(sym);
    if (m && ISO_CURRENCIES.has(m[1]) && ISO_CURRENCIES.has(m[2])) {
      return {
        type: "forex",
        confidence: "medium",
        reason: `Forex pair (${m[1]}/${m[2]})`,
      };
    }
    // 6-letter all-caps but unknown currencies — fall through to us_stock
    // later (e.g. "GOOGLE" would be caught by the us-ticker rule below).
  }
  if (sym.length === 3 && ISO_CURRENCIES.has(sym)) {
    return { type: "forex", confidence: "medium", reason: "Single ISO-4217 currency code" };
  }

  // 7. Hong Kong 5-digit format, no suffix (medium, ambiguous) ---------------
  // Runs AFTER all A-share rules so it only catches 4-digit stuff and the
  // rare 5-digit HK codes that don't start with 0/3/5/6/9 (e.g. "12345").
  // This is intentionally loose — we flag ambiguity in the reason string.
  if (RE_HK_LIKE.test(sym) && sym.length >= 4 && sym.length <= 5) {
    return {
      type: "us_stock",
      confidence: "medium",
      reason: "Ambiguous Hong Kong format, consider adding .HK suffix",
    };
  }

  // 8. US ticker format (medium-high) ----------------------------------------
  if (RE_US_TICKER.test(sym)) {
    return { type: "us_stock", confidence: "high", reason: "US ticker format (1-5 letters)" };
  }
  if (RE_US_CLASS.test(sym)) {
    return { type: "us_stock", confidence: "high", reason: "US class-share notation (e.g. BRK.B)" };
  }

  // 9. ETF keyword in the ticker itself --------------------------------------
  if (sym.includes("ETF")) {
    return { type: "etf", confidence: "medium", reason: "Contains 'ETF' keyword" };
  }

  // 10. Fallback -------------------------------------------------------------
  return { type: "other", confidence: "low", reason: "unrecognized pattern" };
}

/**
 * Convenience wrapper: returns just the inferred `AssetType`, dropping the
 * confidence + reason metadata. Falls back to `other` when inference yields
 * no useful signal.
 */
export function inferAssetTypeSimple(ticker: string): AssetType {
  return inferAssetType(ticker).type;
}
