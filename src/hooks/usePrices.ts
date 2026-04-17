import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Asset } from '@/types/asset';
import type { PriceResult } from '@/types/price';
import { getPrices } from '@/services/priceService';
import { useSettings } from '@/stores/settingsStore';
import {
  anyOpen,
  isMarketOpen,
  marketForAsset,
  type MarketKind,
} from '@/utils/marketHours';

/** When the document is hidden we throttle polling down to this cadence (ms). */
const HIDDEN_POLL_MS = 5 * 60 * 1000;

export interface UsePricesResult {
  prices: Map<string, PriceResult>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  /** Per-market open/closed status at the last evaluation tick. */
  marketStatus: Partial<Record<MarketKind, boolean>>;
  /** When the next auto-poll is expected, or null if auto-polling is paused. */
  nextPollAt: Date | null;
}

export function usePrices(assets: Asset[]): UsePricesResult {
  const queryClient = useQueryClient();
  const { settings } = useSettings();

  // ---- Build stable query key & relevant markets set ---------------------
  const tickers = useMemo(
    () =>
      assets
        .filter((a) => !!a.ticker)
        .map((a) => a.ticker!)
        .sort(),
    [assets],
  );
  const queryKey = useMemo(() => ['prices', ...tickers], [tickers]);

  const markets = useMemo<MarketKind[]>(() => {
    const set = new Set<MarketKind>();
    for (const a of assets) {
      if (!a.ticker) continue;
      const m = marketForAsset({ type: a.type, ticker: a.ticker });
      if (m !== 'none') set.add(m);
    }
    return Array.from(set);
  }, [assets]);

  // ---- Reactive visibility tracking --------------------------------------
  // We recompute refetchInterval / nextPollAt whenever visibility flips OR
  // when market status crosses an open/close boundary (so the UI shows the
  // right nextPollAt).
  const [hidden, setHidden] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.hidden : false,
  );
  // A tick counter to re-evaluate market status periodically (every 60s).
  const [statusTick, setStatusTick] = useState(0);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    function onVisibility() {
      const isHidden = document.hidden;
      setHidden(isHidden);
      // When we come back to foreground, fire a catch-up fetch so the user
      // doesn't stare at stale prices waiting for the next tick.
      if (!isHidden) {
        queryClient.invalidateQueries({ queryKey });
      }
    }

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [queryClient, queryKey]);

  // Re-evaluate open/closed status every 60s so the pause/resume transitions
  // at session boundaries without waiting for a full poll interval.
  useEffect(() => {
    const id = window.setInterval(() => setStatusTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // ---- Compute per-market status snapshot --------------------------------
  const marketStatus = useMemo<Partial<Record<MarketKind, boolean>>>(() => {
    const now = new Date();
    const out: Partial<Record<MarketKind, boolean>> = {};
    for (const m of markets) out[m] = isMarketOpen(m, now);
    return out;
    // statusTick drives re-eval over time; markets drives re-eval when the
    // portfolio changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markets, statusTick]);

  const anyMarketOpen = useMemo(
    () => anyOpen(markets, new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markets, statusTick],
  );

  // ---- Derive refetchInterval -------------------------------------------
  // Rules (in order):
  //   1. No tickers at all → polling disabled (react-query `enabled:false`).
  //   2. pollOnlyWhenMarketOpen && no market open → paused (false).
  //   3. Tab hidden → throttle to HIDDEN_POLL_MS.
  //   4. Otherwise → settings.pollIntervalSec * 1000.
  const refetchIntervalMs = useMemo<number | false>(() => {
    if (tickers.length === 0) return false;
    if (settings.pollOnlyWhenMarketOpen && !anyMarketOpen) return false;
    if (hidden) return HIDDEN_POLL_MS;
    return settings.pollIntervalSec * 1000;
  }, [
    tickers.length,
    settings.pollOnlyWhenMarketOpen,
    settings.pollIntervalSec,
    anyMarketOpen,
    hidden,
  ]);

  // ---- React-Query hook --------------------------------------------------
  const { data, isLoading, error, dataUpdatedAt } = useQuery<
    Map<string, PriceResult>,
    Error
  >({
    queryKey,
    queryFn: () =>
      getPrices(
        assets
          .filter((a) => !!a.ticker)
          .map((a) => ({ type: a.type, ticker: a.ticker! })),
      ),
    enabled: tickers.length > 0,
    refetchInterval: refetchIntervalMs,
    // Don't auto-poll in the background when paused — react-query still
    // honours refetchInterval===false, but we also set this for clarity:
    refetchIntervalInBackground: false,
    staleTime: 60 * 1000,
    retry: 2,
  });

  // ---- Track nextPollAt for UI consumers ---------------------------------
  // We estimate this from dataUpdatedAt + refetchIntervalMs; when paused or
  // disabled, it's null.
  const lastUpdatedAtRef = useRef<number>(dataUpdatedAt);
  useEffect(() => {
    lastUpdatedAtRef.current = dataUpdatedAt || Date.now();
  }, [dataUpdatedAt]);

  const nextPollAt = useMemo<Date | null>(() => {
    if (refetchIntervalMs === false) return null;
    const base = dataUpdatedAt || Date.now();
    return new Date(base + refetchIntervalMs);
  }, [refetchIntervalMs, dataUpdatedAt]);

  // ---- Manual refetch: bypasses market-hours check -----------------------
  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    prices: data ?? new Map(),
    isLoading,
    error: error ?? null,
    refetch,
    marketStatus,
    nextPollAt,
  };
}
