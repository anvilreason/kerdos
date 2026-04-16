import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Snapshot } from "@/types/snapshot";
import type { AssetValue } from "@/hooks/useNetWorth";

interface TopMoversProps {
  snapshots: Snapshot[];
  assetValues: AssetValue[];
  currency: string;
}

function formatCurrencyShort(value: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$", CNY: "\u00a5", EUR: "\u20ac", GBP: "\u00a3", JPY: "\u00a5", HKD: "HK$",
  };
  const symbol = symbols[currency] ?? currency + " ";
  const formatted = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return value < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

export default function TopMovers({ snapshots, assetValues, currency }: TopMoversProps) {
  const { t } = useTranslation();

  const movers = useMemo(() => {
    if (snapshots.length < 2 || assetValues.length === 0) return [];

    const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];

    const prevMap = new Map<string, number>();
    for (const b of prev.breakdown) {
      prevMap.set(b.assetId, b.value);
    }

    const results: {
      assetId: string;
      name: string;
      changePercent: number;
      currentValue: number;
    }[] = [];

    for (const b of latest.breakdown) {
      const prevValue = prevMap.get(b.assetId);
      if (prevValue == null || prevValue === 0) continue;
      const changePct = ((b.value - prevValue) / prevValue) * 100;
      const asset = assetValues.find((a) => a.assetId === b.assetId);
      if (!asset) continue;
      results.push({
        assetId: b.assetId,
        name: asset.name,
        changePercent: changePct,
        currentValue: b.value,
      });
    }

    // Sort by absolute change %
    results.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    return results.slice(0, 5);
  }, [snapshots, assetValues]);

  const cardStyle: React.CSSProperties = {
    background: "var(--color-base-10)",
    border: "1px solid var(--color-base-20)",
    borderRadius: 8,
    padding: "20px 24px",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    color: "var(--color-text-muted)",
    marginBottom: 16,
    fontWeight: 500,
  };

  return (
    <div style={cardStyle}>
      <div style={labelStyle}>{t("dashboard.topMovers", "Top Movers")}</div>
      {movers.length === 0 ? (
        <p style={{ color: "var(--color-text-faint)", fontSize: 13 }}>
          {t("dashboard.noMoversData", "Not enough data yet")}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {movers.map((m) => {
            const isPositive = m.changePercent >= 0;
            return (
              <div
                key={m.assetId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-monospace)",
                    fontSize: 13,
                    color: "var(--color-text-normal)",
                    fontWeight: 500,
                    minWidth: 80,
                  }}
                >
                  {m.name}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-monospace)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: isPositive
                      ? "var(--color-gain)"
                      : "var(--color-loss)",
                    minWidth: 70,
                    textAlign: "right",
                  }}
                >
                  {isPositive ? "+" : ""}
                  {m.changePercent.toFixed(1)}%
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-monospace)",
                    fontSize: 13,
                    color: "var(--color-text-muted)",
                    minWidth: 90,
                    textAlign: "right",
                  }}
                >
                  {formatCurrencyShort(m.currentValue, currency)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
