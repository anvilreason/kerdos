import { useMemo } from "react";
import { useSnapshots } from "@/hooks/useSnapshots";
import { useTransactions } from "@/hooks/useTransactions";
import { useSettings } from "@/stores/settingsStore";
import {
  calculateTWR,
  calculateXIRRFromInputs,
  type TWRResult,
  type XIRRResult,
} from "@/utils/returns";
import { maxDrawdown, type DrawdownResult } from "@/utils/drawdown";
import { convertCurrency } from "@/utils/currency";

export interface UseReturnsResult {
  twr: TWRResult | null;
  xirr: XIRRResult | null;
  maxDD: DrawdownResult | null;
  isLoading: boolean;
}

/**
 * Combined returns hook — derives TWR, XIRR, and Max Drawdown from the
 * full daily snapshot history plus the user's recorded cash flows.
 *
 * Inputs:
 *   · All daily snapshots (intraday rows excluded — they would add
 *     noise to end-of-day calculations and are not used by TWR segment
 *     logic). Pull-window is 3650 days (~10 years), effectively "all"
 *     for any realistic user; avoids hard-coding `null`.
 *   · All transactions (via useTransactions).
 *   · baseCurrency from settings — all flows and snapshot totals are
 *     normalised to this currency before the math runs.
 *
 * Output:
 *   · twr, xirr, maxDD all null when the series is too short to produce
 *     a meaningful number (< 2 snapshots, no sign change, flat or
 *     monotonically-rising series, etc).
 *   · isLoading reflects the underlying hooks' loading state so Dashboard
 *     can render a skeleton instead of zeros.
 *
 * The drawdown series reuses the same baseCurrency normalisation so the
 * %-drop is computed on a consistent currency basis.
 */
export function useReturns(): UseReturnsResult {
  // 3650 days ≈ 10 years. Daily only (intraday skipped).
  const { snapshots, isLoading: snapsLoading } = useSnapshots(3650);
  const { transactions, isLoading: txnsLoading } = useTransactions();
  const { settings, isLoading: settingsLoading } = useSettings();

  const isLoading = snapsLoading || txnsLoading || settingsLoading;

  const twr = useMemo<TWRResult | null>(() => {
    if (snapshots.length < 2) return null;
    return calculateTWR({
      snapshots,
      transactions,
      baseCurrency: settings.baseCurrency,
    });
  }, [snapshots, transactions, settings.baseCurrency]);

  const xirr = useMemo<XIRRResult | null>(() => {
    if (snapshots.length < 2) return null;
    // XIRR requires at least one real cash flow to be meaningful — without
    // transactions there is no investor-side sign change and "annualised
    // dollar-weighted return" isn't well-defined. Rather than synthesise
    // a fake deposit (which would silently produce a CAGR off the first
    // snapshot and over-state the rate for portfolios that grew from a
    // small seed), we return null and let the UI show "Add cash flows".
    if (transactions.length === 0) return null;
    return calculateXIRRFromInputs({
      snapshots,
      transactions,
      baseCurrency: settings.baseCurrency,
    });
  }, [snapshots, transactions, settings.baseCurrency]);

  const maxDD = useMemo<DrawdownResult | null>(() => {
    if (snapshots.length < 2) return null;
    const base = settings.baseCurrency;
    // De-dup to one value per date (last-write-wins for intraday, but the
    // hook already filters intraday out). Guard against duplicate dates
    // from ad-hoc imports by picking the maximum value per date.
    const byDate = new Map<string, number>();
    for (const s of snapshots) {
      const v = convertCurrency(s.totalNetWorth, s.currency, base);
      const prev = byDate.get(s.date);
      if (prev === undefined || v > prev) byDate.set(s.date, v);
    }
    const series = [...byDate.entries()]
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return maxDrawdown(series);
  }, [snapshots, settings.baseCurrency]);

  return { twr, xirr, maxDD, isLoading };
}
