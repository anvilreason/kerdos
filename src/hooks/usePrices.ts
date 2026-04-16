import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type { Asset } from '@/types/asset';
import type { PriceResult } from '@/types/price';
import { getPrices } from '@/services/priceService';

/** Default refetch interval: 5 minutes. */
const REFETCH_INTERVAL = 5 * 60 * 1000;

export function usePrices(assets: Asset[]): {
  prices: Map<string, PriceResult>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const queryClient = useQueryClient();

  // Build a stable query key from sorted tickers
  const tickers = useMemo(
    () =>
      assets
        .filter((a) => !!a.ticker)
        .map((a) => a.ticker!)
        .sort(),
    [assets],
  );

  const queryKey = useMemo(() => ['prices', ...tickers], [tickers]);

  const { data, isLoading, error } = useQuery<Map<string, PriceResult>, Error>({
    queryKey,
    queryFn: () =>
      getPrices(
        assets
          .filter((a) => !!a.ticker)
          .map((a) => ({ type: a.type, ticker: a.ticker! })),
      ),
    enabled: tickers.length > 0,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 60 * 1000,
    retry: 2,
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    prices: data ?? new Map(),
    isLoading,
    error: error ?? null,
    refetch,
  };
}
