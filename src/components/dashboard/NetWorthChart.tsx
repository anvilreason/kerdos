import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
} from 'recharts';
import type { Snapshot } from '@/types/snapshot';
import { useBenchmark } from '@/hooks/useBenchmark';
import type { BenchmarkId, BenchmarkRange } from '@/services/benchmarkService';

interface NetWorthChartProps {
  snapshots: Snapshot[];
  /**
   * Optional max-drawdown window to shade on the primary curve. Produced by
   * W3-03's useReturns hook and threaded through by Dashboard.tsx. When
   * undefined, no shading is drawn.
   */
  drawdown?: {
    peakDate: string;
    troughDate: string;
    /** Drawdown magnitude as a negative fraction (e.g. -0.12 for a 12% drop). */
    value: number;
  };
}

type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

// Lookback window in days. `1D` is handled specially (today only).
const RANGE_DAYS: Record<TimeRange, number | null> = {
  '1D': 0,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
  ALL: null,
};

/**
 * Map the user-visible time range to a benchmark range the Worker accepts.
 * Worker only serves 1m | 3m | 1y | all. 1D / 1W collapse to 1m (closest
 * available) and ALL maps to all.
 */
function rangeToBenchmarkRange(range: TimeRange): BenchmarkRange {
  switch (range) {
    case '1D':
    case '1W':
    case '1M':
      return '1m';
    case '3M':
      return '3m';
    case '1Y':
      return '1y';
    case 'ALL':
      return 'all';
  }
}

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Format an X-axis tick given the active range. `row` carries both the
 * date string and the snapshot's createdAt (for intraday HH:mm).
 */
function formatAxisLabel(
  range: TimeRange,
  row: { date: string; createdAt: Date; intraday: boolean },
): string {
  if (range === '1D') {
    const hh = String(row.createdAt.getHours()).padStart(2, '0');
    const mm = String(row.createdAt.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  if (range === '1W' || range === '1M') {
    // MM-DD
    const d = new Date(row.date + 'T00:00:00');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${mo}-${da}`;
  }
  // 3M / 1Y / ALL — YYYY-MM-DD
  return row.date;
}

function formatTooltipHeader(
  range: TimeRange,
  row: { date: string; createdAt: Date; intraday: boolean },
): string {
  if (range === '1D' || row.intraday) {
    const hh = String(row.createdAt.getHours()).padStart(2, '0');
    const mm = String(row.createdAt.getMinutes()).padStart(2, '0');
    return `${row.date} ${hh}:${mm}`;
  }
  return row.date;
}

function formatValue(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

/** Format a normalised index value as "{sign}{pct}%" relative to 100. */
function formatNormalised(value: number): string {
  const delta = value - 100;
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}%`;
}

/** Format an arbitrary percentage (already in percent units, e.g. 12.4). */
function formatPct(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

/** Extract YYYY-MM-DD from either an ISO datetime or a bare date string. */
function toDateKey(s: string): string {
  return s.length >= 10 ? s.slice(0, 10) : s;
}

const BENCHMARK_LABEL_KEYS: Record<BenchmarkId, string> = {
  sp500: 'dashboard.chart.compare.sp500',
  csi300: 'dashboard.chart.compare.csi300',
  btc: 'dashboard.chart.compare.btc',
};

export default function NetWorthChart({ snapshots, drawdown }: NetWorthChartProps) {
  const { t } = useTranslation();
  const [range, setRange] = useState<TimeRange>('3M');
  const [benchmarkId, setBenchmarkId] = useState<BenchmarkId | null>(null);

  const benchmarkRange = rangeToBenchmarkRange(range);
  const {
    data: benchmarkResult,
    isLoading: benchmarkLoading,
  } = useBenchmark(benchmarkId, benchmarkRange);

  // Pre-normalise rows so we have a stable createdAt Date + intraday flag.
  const rows = useMemo(
    () =>
      snapshots.map((s) => ({
        id: s.id,
        date: s.date,
        createdAt:
          s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt),
        intraday: Boolean(s.intraday),
        totalNetWorth: s.totalNetWorth,
      })),
    [snapshots],
  );

  const hasAnyIntradayToday = useMemo(() => {
    const today = todayStr();
    return rows.some((r) => r.intraday && r.date === today);
  }, [rows]);

  // Primary series: snapshots filtered + sorted for the active range.
  const primarySeries = useMemo(() => {
    let filtered: typeof rows;
    if (range === '1D') {
      const today = todayStr();
      filtered = rows.filter((r) => r.date === today);
    } else {
      const days = RANGE_DAYS[range];
      if (days == null) {
        filtered = rows;
      } else {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        filtered = rows.filter((r) => r.date >= cutoffStr);
      }
    }

    filtered = [...filtered].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return filtered;
  }, [rows, range]);

  // Benchmark series, clipped to the same window as the primary series
  // (Worker range is coarse — e.g. 1W uses a 1m window, so we trim locally).
  const benchmarkSeries = useMemo(() => {
    if (!benchmarkResult) return null;
    const pts = benchmarkResult.points;
    if (pts.length === 0) return null;

    if (primarySeries.length === 0) return pts;

    const firstKey = toDateKey(primarySeries[0].date);
    return pts.filter((p) => toDateKey(p.date) >= firstKey);
  }, [benchmarkResult, primarySeries]);

  /**
   * Merge primary + benchmark into a single chart dataset keyed by position.
   *
   * When benchmarkId is null we keep the simple absolute-value shape (legacy
   * behaviour). When a benchmark is selected we normalise both series to a
   * start = 100 index and align by date: primary anchors the x-axis, benchmark
   * points are looked up / forward-filled by date so the two lines share
   * chronological alignment without distorting the primary timeline.
   */
  const chartData = useMemo(() => {
    const activeBenchmark = benchmarkId !== null && benchmarkSeries !== null;

    if (!activeBenchmark) {
      return primarySeries.map((r, i) => {
        const prev = i > 0 ? primarySeries[i - 1] : null;
        const change = prev ? r.totalNetWorth - prev.totalNetWorth : 0;
        return {
          id: r.id,
          date: r.date,
          createdAt: r.createdAt,
          intraday: r.intraday,
          label: formatAxisLabel(range, r),
          value: r.totalNetWorth,
          change,
          // absent in None mode, declared here so downstream field access
          // stays uniform for TS
          primaryNorm: undefined as number | undefined,
          benchmarkNorm: undefined as number | undefined,
        };
      });
    }

    // Normalised mode -----------------------------------------------------
    const firstPrimary = primarySeries[0]?.totalNetWorth ?? 0;
    const firstBench = benchmarkSeries && benchmarkSeries.length > 0
      ? benchmarkSeries[0].value
      : 0;

    // Build a date -> benchmark value map for forward-fill lookup.
    const benchByDate = new Map<string, number>();
    if (benchmarkSeries) {
      for (const p of benchmarkSeries) {
        benchByDate.set(toDateKey(p.date), p.value);
      }
    }

    // Sorted benchmark date keys for efficient forward-fill.
    const benchKeys = benchmarkSeries
      ? benchmarkSeries.map((p) => toDateKey(p.date))
      : [];
    let benchCursor = 0;

    return primarySeries.map((r, i) => {
      const prev = i > 0 ? primarySeries[i - 1] : null;
      const change = prev ? r.totalNetWorth - prev.totalNetWorth : 0;

      const key = toDateKey(r.date);
      // Forward-fill: advance cursor while the next bench date is <= key.
      while (
        benchCursor + 1 < benchKeys.length &&
        benchKeys[benchCursor + 1] <= key
      ) {
        benchCursor += 1;
      }
      let benchValueRaw: number | undefined;
      if (benchKeys.length > 0) {
        // Only trust the forward-filled value if the cursor's date is <= key.
        // Before the benchmark series begins, leave undefined so the line
        // starts where data actually exists.
        if (benchKeys[benchCursor] <= key) {
          benchValueRaw = benchByDate.get(benchKeys[benchCursor]);
        }
      }

      const primaryNorm =
        firstPrimary > 0 ? (r.totalNetWorth / firstPrimary) * 100 : 100;
      const benchmarkNorm =
        benchValueRaw !== undefined && firstBench > 0
          ? (benchValueRaw / firstBench) * 100
          : undefined;

      return {
        id: r.id,
        date: r.date,
        createdAt: r.createdAt,
        intraday: r.intraday,
        label: formatAxisLabel(range, r),
        value: r.totalNetWorth,
        change,
        primaryNorm,
        benchmarkNorm,
      };
    });
  }, [primarySeries, benchmarkSeries, benchmarkId, range]);

  // Legend numbers: interval return for both series.
  const legendStats = useMemo(() => {
    if (benchmarkId === null || primarySeries.length < 2) {
      return null;
    }
    const p0 = primarySeries[0].totalNetWorth;
    const pN = primarySeries[primarySeries.length - 1].totalNetWorth;
    const primaryPct = p0 > 0 ? ((pN - p0) / p0) * 100 : 0;

    let benchmarkPct: number | null = null;
    if (benchmarkSeries && benchmarkSeries.length >= 2) {
      const b0 = benchmarkSeries[0].value;
      const bN = benchmarkSeries[benchmarkSeries.length - 1].value;
      if (b0 > 0) benchmarkPct = ((bN - b0) / b0) * 100;
    }
    return { primaryPct, benchmarkPct };
  }, [primarySeries, benchmarkSeries, benchmarkId]);

  // Drawdown shading bounds — translate date keys to x-axis label positions.
  const drawdownBounds = useMemo(() => {
    if (!drawdown || chartData.length === 0) return null;
    const peakKey = toDateKey(drawdown.peakDate);
    const troughKey = toDateKey(drawdown.troughDate);

    let peakLabel: string | null = null;
    let troughLabel: string | null = null;
    for (const row of chartData) {
      const k = toDateKey(row.date);
      if (peakLabel === null && k >= peakKey) peakLabel = row.label;
      if (k <= troughKey) troughLabel = row.label;
    }
    if (!peakLabel || !troughLabel) return null;
    return { x1: peakLabel, x2: troughLabel };
  }, [drawdown, chartData]);

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-base-10)',
    border: '1px solid var(--color-base-20)',
    borderRadius: 8,
    padding: '20px 24px',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
    flexWrap: 'wrap',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    color: 'var(--color-text-muted)',
    fontWeight: 500,
  };

  const controlsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  };

  const btnGroupStyle: React.CSSProperties = {
    display: 'flex',
    gap: 4,
  };

  const ranges: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

  const rangeButtons = (
    <div style={btnGroupStyle}>
      {ranges.map((r) => (
        <RangeButton
          key={r}
          label={t(`dashboard.chart.range.${r.toLowerCase()}`, r)}
          active={range === r}
          onClick={() => setRange(r)}
        />
      ))}
    </div>
  );

  const compareSelect = (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        color: 'var(--color-text-muted)',
        fontFamily: 'var(--font-monospace)',
      }}
    >
      <span>{t('dashboard.chart.compare.label')}:</span>
      <select
        value={benchmarkId ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          setBenchmarkId(v === '' ? null : (v as BenchmarkId));
        }}
        style={{
          fontFamily: 'var(--font-monospace)',
          fontSize: 11,
          color: 'var(--color-text-normal)',
          background: 'var(--color-base-00)',
          border: '1px solid var(--color-base-20)',
          borderRadius: 4,
          padding: '3px 6px',
          cursor: 'pointer',
        }}
      >
        <option value="">{t('dashboard.chart.compare.none')}</option>
        <option value="sp500">{t('dashboard.chart.compare.sp500')}</option>
        <option value="csi300">{t('dashboard.chart.compare.csi300')}</option>
        <option value="btc">{t('dashboard.chart.compare.btc')}</option>
      </select>
    </label>
  );

  const headerControls = (
    <div style={controlsStyle}>
      {compareSelect}
      {rangeButtons}
    </div>
  );

  // 1D with no intraday data → bespoke empty state.
  if (range === '1D' && !hasAnyIntradayToday) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={labelStyle}>{t('dashboard.netWorthTrend')}</div>
          {headerControls}
        </div>
        <div
          style={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-faint)',
            fontSize: 13,
            textAlign: 'center',
            padding: '0 16px',
          }}
        >
          {t('dashboard.chart.emptyIntraday')}
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={labelStyle}>{t('dashboard.netWorthTrend')}</div>
          {headerControls}
        </div>
        <div
          style={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-faint)',
            fontSize: 13,
          }}
        >
          {t('dashboard.noSnapshotData')}
        </div>
      </div>
    );
  }

  const normalisedMode = benchmarkId !== null;
  // Legend row shown when a benchmark is selected.
  const benchmarkUnavailable =
    normalisedMode && !benchmarkLoading && benchmarkResult === null;

  const legendRow = normalisedMode ? (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginTop: 12,
        fontSize: 12,
        fontFamily: 'var(--font-monospace)',
        color: 'var(--color-text-muted)',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            display: 'inline-block',
            width: 10,
            height: 2,
            background: 'var(--color-accent-kerdos)',
          }}
        />
        <span>{t('dashboard.netWorth')}:</span>
        {legendStats ? (
          <span
            style={{
              color:
                legendStats.primaryPct >= 0
                  ? 'var(--color-gain)'
                  : 'var(--color-loss)',
            }}
          >
            {formatPct(legendStats.primaryPct)}
          </span>
        ) : (
          <span>--</span>
        )}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            display: 'inline-block',
            width: 10,
            height: 2,
            background: 'var(--color-text-muted)',
            borderTop: '1px dashed var(--color-text-muted)',
          }}
        />
        <span>
          {benchmarkId
            ? t(BENCHMARK_LABEL_KEYS[benchmarkId])
            : ''}
          :
        </span>
        {benchmarkLoading ? (
          <span style={{ color: 'var(--color-text-faint)' }}>...</span>
        ) : benchmarkUnavailable ? (
          <span style={{ color: 'var(--color-text-faint)' }}>
            {t('dashboard.chart.benchmark.unavailable')}
          </span>
        ) : legendStats && legendStats.benchmarkPct !== null ? (
          <span
            style={{
              color:
                legendStats.benchmarkPct >= 0
                  ? 'var(--color-gain)'
                  : 'var(--color-loss)',
            }}
          >
            {formatPct(legendStats.benchmarkPct)}
          </span>
        ) : (
          <span>--</span>
        )}
        {benchmarkResult?.stale && (
          <span
            style={{
              marginLeft: 4,
              padding: '1px 5px',
              fontSize: 10,
              color: 'var(--color-text-faint)',
              border: '1px solid var(--color-base-20)',
              borderRadius: 3,
            }}
          >
            {t('dashboard.chart.benchmark.cached')}
          </span>
        )}
      </span>
      {drawdown && drawdownBounds && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 8,
              background: 'var(--color-loss)',
              opacity: 0.18,
              border: '1px dashed var(--color-loss)',
            }}
          />
          <span>{t('dashboard.chart.drawdown.label')}</span>
        </span>
      )}
    </div>
  ) : drawdown && drawdownBounds ? (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        fontSize: 12,
        fontFamily: 'var(--font-monospace)',
        color: 'var(--color-text-muted)',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 10,
          height: 8,
          background: 'var(--color-loss)',
          opacity: 0.18,
          border: '1px dashed var(--color-loss)',
        }}
      />
      <span>{t('dashboard.chart.drawdown.label')}</span>
    </div>
  ) : null;

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={labelStyle}>{t('dashboard.netWorthTrend')}</div>
        {headerControls}
      </div>
      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent-kerdos)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-accent-kerdos)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-20)" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={normalisedMode ? formatNormalised : formatValue}
              tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={60}
              domain={normalisedMode ? ['auto', 'auto'] : undefined}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const entry = payload[0].payload as (typeof chartData)[number];
                const changeStr =
                  entry.change !== 0
                    ? `${entry.change > 0 ? '+' : ''}$${Math.abs(entry.change).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    : '--';
                return (
                  <div
                    style={{
                      background: 'var(--color-base-00)',
                      border: '1px solid var(--color-base-20)',
                      borderRadius: 8,
                      padding: '10px 14px',
                      fontSize: 13,
                    }}
                  >
                    <div style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}>
                      {formatTooltipHeader(range, entry)}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-monospace)',
                        color: 'var(--color-text-normal)',
                        fontWeight: 600,
                      }}
                    >
                      ${Number(entry.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      {normalisedMode && entry.primaryNorm !== undefined && (
                        <span
                          style={{
                            marginLeft: 8,
                            color: 'var(--color-text-faint)',
                            fontWeight: 400,
                            fontSize: 12,
                          }}
                        >
                          ({formatNormalised(entry.primaryNorm)})
                        </span>
                      )}
                    </div>
                    {normalisedMode && entry.benchmarkNorm !== undefined && benchmarkId && (
                      <div
                        style={{
                          fontFamily: 'var(--font-monospace)',
                          color: 'var(--color-text-muted)',
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {t(BENCHMARK_LABEL_KEYS[benchmarkId])}: {formatNormalised(entry.benchmarkNorm)}
                      </div>
                    )}
                    {!normalisedMode && (
                      <div
                        style={{
                          fontFamily: 'var(--font-monospace)',
                          color:
                            entry.change > 0
                              ? 'var(--color-gain)'
                              : entry.change < 0
                                ? 'var(--color-loss)'
                                : 'var(--color-text-faint)',
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {changeStr}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            {drawdown && drawdownBounds && (
              <ReferenceArea
                x1={drawdownBounds.x1}
                x2={drawdownBounds.x2}
                strokeOpacity={0.4}
                stroke="var(--color-loss)"
                strokeDasharray="4 3"
                fill="var(--color-loss)"
                fillOpacity={0.12}
                ifOverflow="extendDomain"
              />
            )}
            {normalisedMode ? (
              <>
                <Line
                  type="monotone"
                  dataKey="primaryNorm"
                  stroke="var(--color-accent-kerdos)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="benchmarkNorm"
                  stroke="var(--color-text-muted)"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  dot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              </>
            ) : (
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--color-accent-kerdos)"
                strokeWidth={2}
                fill="url(#goldGradient)"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {legendRow}
    </div>
  );
}

function RangeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-monospace)',
        fontSize: 11,
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--color-accent-kerdos)' : 'var(--color-text-faint)',
        background: active ? 'var(--color-accent-subtle)' : 'transparent',
        border: '1px solid',
        borderColor: active ? 'var(--color-accent-kerdos)' : 'var(--color-base-20)',
        borderRadius: 4,
        padding: '3px 8px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  );
}
