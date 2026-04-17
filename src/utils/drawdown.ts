/**
 * Maximum drawdown — the worst peak-to-trough drop experienced by a
 * value series. A classic risk metric complementary to TWR/XIRR: TWR
 * tells you how good the outcome was, drawdown tells you how rough the
 * ride was getting there.
 *
 * Algorithm (single pass, O(n)):
 *   · Walk through the series. Maintain the running maximum value seen
 *     so far along with the date on which it occurred.
 *   · At each point, drawdown_i = (value_i - runningMax) / runningMax.
 *     This is ≤ 0 by construction.
 *   · Track the most negative drawdown — its index is the trough, the
 *     corresponding runningMax at that moment is the peak.
 *   · After the trough, scan forward for the FIRST point whose value is
 *     ≥ the peak value. That is the recovery date; if none exists, the
 *     drawdown has not recovered yet (we return recoveryDate: null).
 *
 * Output shape matches the T-W3-03 spec:
 *   · `value` is the drawdown expressed as a negative fraction, e.g.
 *     -0.186 = the portfolio fell 18.6% from peak to trough.
 *   · `durationDays` is peak -> trough inclusive distance in calendar days
 *     (never negative; 0 for same-day peak/trough).
 */

export interface DrawdownResult {
  /** Max drawdown as a negative fraction, e.g. -0.186 = -18.6%. */
  value: number;
  /** Date (YYYY-MM-DD) the peak was set before the worst drawdown. */
  peakDate: string;
  /** Date (YYYY-MM-DD) of the trough following that peak. */
  troughDate: string;
  /** Date the portfolio first recovered back to the peak value, or null. */
  recoveryDate: string | null;
  /** Whole calendar days from peakDate to troughDate (>= 0). */
  durationDays: number;
}

const MS_PER_DAY = 86_400_000;

function parseYMD(s: string): Date {
  return new Date(`${s}T00:00:00`);
}

function daysBetween(aStr: string, bStr: string): number {
  const a = parseYMD(aStr).getTime();
  const b = parseYMD(bStr).getTime();
  return Math.max(0, Math.round((b - a) / MS_PER_DAY));
}

/**
 * Compute the maximum drawdown over a value series.
 *
 * Preconditions:
 *   · Series should be sorted ASC by date (we do not re-sort — callers
 *     that pass random order will get meaningless results). This matches
 *     returns.ts's contract.
 *   · Values are assumed positive (net worth is a $ amount). A zero or
 *     negative peak short-circuits to "no drawdown" to avoid division
 *     by zero.
 *
 * Returns null when:
 *   · Series is empty.
 *   · No non-positive drawdown point found (i.e. pure monotonically
 *     increasing series — no peak-to-trough drop to report).
 */
export function maxDrawdown(
  series: { date: string; value: number }[],
): DrawdownResult | null {
  if (series.length === 0) return null;

  // Single pass to find the worst drawdown AND the peak that produced it.
  // We track the running max and the date it was set. On every sample we
  // compute the drawdown relative to that running max; the worst one wins.
  let runningMax = series[0].value;
  let runningMaxDate = series[0].date;

  let worstDrawdown = 0; // 0 means "flat or up-only"
  let worstPeak = runningMax;
  let worstPeakDate = runningMaxDate;
  let worstTroughDate = runningMaxDate;
  let worstTroughIdx = 0;

  for (let i = 0; i < series.length; i++) {
    const { date, value } = series[i];

    if (value > runningMax) {
      runningMax = value;
      runningMaxDate = date;
    }

    if (runningMax > 0) {
      const dd = (value - runningMax) / runningMax;
      if (dd < worstDrawdown) {
        worstDrawdown = dd;
        worstPeak = runningMax;
        worstPeakDate = runningMaxDate;
        worstTroughDate = date;
        worstTroughIdx = i;
      }
    }
  }

  // No negative drawdown observed -> nothing meaningful to report.
  if (worstDrawdown === 0) return null;

  // Recovery: scan forward of the trough for the first sample that meets
  // or exceeds the peak value. Null if the drawdown is still ongoing.
  let recoveryDate: string | null = null;
  for (let j = worstTroughIdx + 1; j < series.length; j++) {
    if (series[j].value >= worstPeak) {
      recoveryDate = series[j].date;
      break;
    }
  }

  return {
    value: worstDrawdown,
    peakDate: worstPeakDate,
    troughDate: worstTroughDate,
    recoveryDate,
    durationDays: daysBetween(worstPeakDate, worstTroughDate),
  };
}
