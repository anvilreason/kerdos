/**
 * Runtime adapter — abstracts over Web (CORS-proxy) and Tauri (direct fetch).
 *
 * Why this exists
 * ---------------
 * The Kerdos Web build runs inside a browser and therefore must route
 * cross-origin provider calls (Yahoo Finance, CoinGecko, Exchange-Rate-API,
 * MetalPriceAPI, …) through a public CORS proxy, because those providers
 * don't send permissive CORS headers.
 *
 * The Kerdos desktop build (Tauri 2) runs in a native WebView with no
 * same-origin restriction on outbound HTTP, so it can — and should — hit
 * provider URLs directly. Going through a third-party proxy from the desktop
 * would be pointless overhead and a privacy leak.
 *
 * How to use
 * ----------
 * This module is introduced in W4-02 as an **opt-in** helper for *new*
 * providers. The existing providers (`yahooFinance.ts`, `coinGecko.ts`,
 * `exchangeRate.ts`, `metals.ts`) are left untouched — their CORS behavior
 * is already proven stable in W1-W2 and there is no regression budget to
 * spend rewiring them right now. Any future provider, or a planned
 * migration, should prefer `proxiedFetch` over raw `fetch`.
 *
 * The `isTauri` flag is also re-exported for UI code that needs to branch on
 * runtime (e.g. the Landing page hides its "Download" CTA when already
 * running inside the desktop app).
 */

/**
 * True when the bundle is executing inside a Tauri WebView.
 *
 * Tauri 2 injects `window.__TAURI_INTERNALS__` unconditionally; older
 * Tauri 1 code (and some plugins) still look for `window.__TAURI__`. We
 * check both so this flag keeps working across upgrades.
 *
 * Evaluated once at module load. SSR-safe: guards against `window` being
 * undefined (Vite SSR, test harnesses).
 */
export const isTauri: boolean =
  typeof window !== 'undefined' &&
  ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

/**
 * Public CORS proxy used by the Web build.
 *
 * Kept identical to the value hard-coded in `providers/yahooFinance.ts`
 * (see `CORS_PROXY` there) so that Web-side behaviour stays byte-for-byte
 * the same whether a provider uses the adapter or rolls its own fetch.
 */
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

/**
 * Fetch a URL, automatically routing through the CORS proxy on Web.
 *
 * Callers pass the *direct* provider URL — e.g. the real
 * `query1.finance.yahoo.com/...` endpoint — and the adapter decides whether
 * to wrap it. Result and error semantics are identical to the platform
 * `fetch`; we do not swallow or transform errors.
 *
 * Note: we intentionally do not implement the "try direct first, fall back
 * to proxy" pattern that `yahooFinance.ts` uses. That pattern is useful
 * when a provider *occasionally* sends CORS headers; for new providers the
 * caller should know up-front whether the endpoint is CORS-friendly. If
 * such a fallback is needed, it should live in the provider module, not in
 * this generic adapter.
 */
export async function proxiedFetch(
  directUrl: string,
  init?: RequestInit,
): Promise<Response> {
  if (isTauri) {
    return fetch(directUrl, init);
  }
  return fetch(CORS_PROXY + encodeURIComponent(directUrl), init);
}
