import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { setLiveRates } from "@/utils/currency";

/**
 * FX rates loader (added 2026-04-17 after UX review flagged the stale
 * hardcoded table).
 *
 * Pulls `open.er-api.com/v6/latest/USD` — a free, CORS-enabled,
 * no-key endpoint that returns USD → target rates. We invert them
 * to get the "per 1 unit in USD" shape the rest of the app uses.
 *
 * Runs once per 6 hours. On failure, leaves the fallback table alone
 * (so the UI never shows NaN; just possibly slightly stale numbers).
 *
 * Usage: call `useFxRates()` once at the app root (in App.tsx). The
 * hook's side effect is to mutate the module-level table in
 * `src/utils/currency.ts`; synchronous consumers of `convertCurrency`
 * pick up new rates on their next render.
 */

interface ErApiResponse {
  result: "success" | "error";
  base_code?: string;
  rates?: Record<string, number>;
  time_last_update_unix?: number;
}

async function fetchUsdRates(): Promise<{
  ratesToUsd: Record<string, number>;
  asOf: number;
}> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`exchangerate HTTP ${res.status}`);
  }
  const data = (await res.json()) as ErApiResponse;
  if (data.result !== "success" || !data.rates) {
    throw new Error("exchangerate: response not successful");
  }
  // data.rates[CNY] = 7.3 means 1 USD = 7.3 CNY → so 1 CNY = 1/7.3 USD.
  const ratesToUsd: Record<string, number> = { USD: 1 };
  for (const [code, perUsd] of Object.entries(data.rates)) {
    if (typeof perUsd === "number" && perUsd > 0) {
      ratesToUsd[code] = 1 / perUsd;
    }
  }
  return {
    ratesToUsd,
    asOf: data.time_last_update_unix ?? Math.floor(Date.now() / 1000),
  };
}

export interface UseFxRatesResult {
  isLoading: boolean;
  isStale: boolean;
  asOf: number | null; // unix seconds
  refetch: () => void;
}

export function useFxRates(): UseFxRatesResult {
  const query = useQuery({
    queryKey: ["fx-rates", "usd-base"],
    queryFn: fetchUsdRates,
    staleTime: 6 * 60 * 60 * 1000, // 6h
    gcTime: 24 * 60 * 60 * 1000, // 24h
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Side-effect: whenever we get fresh rates, push them into the
  // module-level `currency.ts` table so `convertCurrency` sees them.
  useEffect(() => {
    if (query.data?.ratesToUsd) {
      setLiveRates(query.data.ratesToUsd);
    }
  }, [query.data]);

  return {
    isLoading: query.isLoading,
    isStale: query.isError || query.isStale,
    asOf: query.data?.asOf ?? null,
    refetch: () => void query.refetch(),
  };
}
