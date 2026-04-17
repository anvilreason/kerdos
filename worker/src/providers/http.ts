/**
 * Shared HTTP helper — centralises the User-Agent header.
 *
 * Miniflare / Workerd's fetch defaults to an empty User-Agent, and several
 * upstream providers (CoinGecko, Yahoo, some Stooq endpoints) reject empty
 * or data-center-looking UAs with HTTP 403. Setting a stable browser-ish UA
 * fixes this across the board without pretending to be a specific browser.
 *
 * Discovered 2026-04-17 while validating the W1-03 Worker end-to-end for
 * the first time — BTC /price returned 403 even though curl from a laptop
 * with any UA worked fine. Root cause: fetch() in the Workers runtime.
 */

export const KERDOS_UA =
  'Mozilla/5.0 (compatible; KerdosQuoteRelay/1.0; +https://kerdos.app)';

/**
 * Fetch wrapper that always sets a User-Agent header and a default timeout.
 * Accepts the same params as global fetch; extra headers are merged.
 */
export function kerdosFetch(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const { timeoutMs = 8000, headers, ...rest } = init ?? {};
  const finalHeaders = new Headers(headers);
  if (!finalHeaders.has('User-Agent')) {
    finalHeaders.set('User-Agent', KERDOS_UA);
  }
  if (!finalHeaders.has('Accept')) {
    finalHeaders.set('Accept', 'application/json, text/csv, */*');
  }
  return fetch(url, {
    ...rest,
    headers: finalHeaders,
    signal: init?.signal ?? AbortSignal.timeout(timeoutMs),
  });
}
