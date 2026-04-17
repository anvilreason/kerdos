import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import type { Asset } from "@/types/asset";
import type { PriceResult } from "@/types/price";
import { convertCurrency } from "@/utils/currency";
import { formatCurrency } from "./NetWorthCard";

interface CurrencyExposureProps {
  assets: Asset[];
  /** usePrices output, keyed by ticker. */
  prices: Map<string, PriceResult>;
  baseCurrency: string;
}

/**
 * Currency exposure donut (T-W3-05).
 *
 * For each asset we determine the native currency of its current price —
 * the live quote's currency if a ticker has been priced, otherwise the
 * asset's costCurrency (the same fallback AssetForm uses for manual
 * assets). Market value is aggregated per native currency bucket, kept
 * in native units for the legend ("see how much CNY / USD risk you
 * actually carry"). Proportions are computed after converting each
 * bucket to base currency, so the donut shows real shares even when the
 * buckets are denominated in different currencies.
 */

// Hex palette for common currencies — recharts renders SVG fills so CSS
// vars aren't usable directly. Choices roughly match AllocationPie's
// style: blue for USD, red for CNY etc.
const CURRENCY_COLORS: Record<string, string> = {
  USD: "#60a5fa",
  CNY: "#f87171",
  HKD: "#a78bfa",
  EUR: "#34d399",
  JPY: "#fbbf24",
  GBP: "#c08457",
};
const FALLBACK_COLOR = "#94a3b8";

interface Bucket {
  currency: string;
  nativeValue: number;
  baseValue: number;
}

export default function CurrencyExposure({
  assets,
  prices,
  baseCurrency,
}: CurrencyExposureProps) {
  const { t } = useTranslation();

  const buckets = useMemo<Bucket[]>(() => {
    const byCurrency = new Map<string, { native: number; base: number }>();

    for (const asset of assets) {
      // Determine unit price + currency: live quote first, manual price
      // (in costCurrency) second. If neither is known this asset contributes
      // nothing to exposure — skipping it is safer than guessing a value.
      let unitPrice: number | null = null;
      let currency: string | null = null;
      if (asset.ticker) {
        const pr = prices.get(asset.ticker);
        if (pr) {
          unitPrice = pr.price;
          currency = pr.currency;
        }
      }
      if (unitPrice === null && asset.manualPrice != null) {
        unitPrice = asset.manualPrice;
        currency = asset.costCurrency;
      }
      if (unitPrice === null || currency === null) continue;

      const nativeValue = unitPrice * asset.quantity;
      if (nativeValue <= 0) continue;
      const baseValue = convertCurrency(nativeValue, currency, baseCurrency);

      const cur = byCurrency.get(currency);
      if (cur) {
        cur.native += nativeValue;
        cur.base += baseValue;
      } else {
        byCurrency.set(currency, { native: nativeValue, base: baseValue });
      }
    }

    return Array.from(byCurrency.entries())
      .map(([currency, v]) => ({
        currency,
        nativeValue: v.native,
        baseValue: v.base,
      }))
      .sort((a, b) => b.baseValue - a.baseValue);
  }, [assets, prices, baseCurrency]);

  const totalBase = useMemo(
    () => buckets.reduce((s, b) => s + b.baseValue, 0),
    [buckets],
  );

  const cardStyle: React.CSSProperties = {
    background: "var(--color-base-10)",
    border: "1px solid var(--color-base-20)",
    borderRadius: 8,
    padding: "20px 24px",
  };

  if (buckets.length === 0 || totalBase <= 0) {
    return (
      <div style={cardStyle}>
        <Header
          title={t("dashboard.currencyExposure.title")}
          help={t("dashboard.currencyExposure.help")}
        />
        <div
          style={{
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-text-faint)",
            fontSize: 13,
          }}
        >
          {t("dashboard.noAssetsToDisplay")}
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <Header
        title={t("dashboard.currencyExposure.title")}
        help={t("dashboard.currencyExposure.help")}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 16,
        }}
      >
        {/* Donut chart with total in the middle */}
        <div
          style={{
            position: "relative",
            width: 140,
            height: 140,
            flexShrink: 0,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={buckets}
                dataKey="baseValue"
                nameKey="currency"
                cx="50%"
                cy="50%"
                outerRadius={65}
                innerRadius={42}
                paddingAngle={2}
                stroke="none"
              >
                {buckets.map((b) => (
                  <Cell
                    key={b.currency}
                    fill={CURRENCY_COLORS[b.currency] ?? FALLBACK_COLOR}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--color-base-00)",
                  border: "1px solid var(--color-base-20)",
                  borderRadius: 8,
                  color: "var(--color-text-normal)",
                  fontSize: 13,
                }}
                formatter={(value, _name, entry) => {
                  const pct = totalBase > 0
                    ? ((Number(value) / totalBase) * 100).toFixed(1)
                    : "0";
                  const bucket = entry?.payload as Bucket | undefined;
                  const native = bucket
                    ? formatCurrency(bucket.nativeValue, bucket.currency)
                    : "";
                  return [`${pct}% \u00B7 ${native}`, ""];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: "var(--color-text-faint)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {baseCurrency}
            </span>
            <span
              style={{
                fontFamily: "var(--font-monospace)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-text-normal)",
                lineHeight: 1.1,
                marginTop: 2,
              }}
            >
              {formatCurrency(totalBase, baseCurrency)}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            flex: 1,
            minWidth: 0,
          }}
        >
          {buckets.map((b) => {
            const pct = totalBase > 0 ? (b.baseValue / totalBase) * 100 : 0;
            return (
              <div
                key={b.currency}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background:
                      CURRENCY_COLORS[b.currency] ?? FALLBACK_COLOR,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-monospace)",
                    fontSize: 12,
                    color: "var(--color-text-normal)",
                    fontWeight: 500,
                    minWidth: 36,
                  }}
                >
                  {b.currency}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-monospace)",
                    fontSize: 12,
                    color: "var(--color-text-muted)",
                    minWidth: 46,
                  }}
                >
                  {pct.toFixed(1)}%
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-monospace)",
                    fontSize: 12,
                    color: "var(--color-text-faint)",
                    flex: 1,
                    textAlign: "right",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={formatCurrency(b.nativeValue, b.currency)}
                >
                  {formatCurrency(b.nativeValue, b.currency)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Header({ title, help }: { title: string; help: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: "var(--color-text-muted)",
          fontWeight: 500,
        }}
      >
        {title}
      </span>
      <span
        title={help}
        aria-label={help}
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          border: "1px solid var(--color-base-25, var(--color-base-20))",
          color: "var(--color-text-faint)",
          fontSize: 10,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "help",
        }}
      >
        ?
      </span>
    </div>
  );
}
