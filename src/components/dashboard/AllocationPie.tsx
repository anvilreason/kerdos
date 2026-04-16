import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import type { AssetType } from "@/types/asset";

interface AllocationItem {
  name: string;
  type: AssetType;
  value: number;
}

interface AllocationPieProps {
  assets: AllocationItem[];
}

// Recharts needs actual hex colors at render time for SVG fills,
// so we keep fallback hex values for runtime
const TYPE_COLORS_HEX: Record<string, string> = {
  us_stock: "#60a5fa",
  cn_stock: "#f87171",
  etf: "#34d399",
  crypto: "#a78bfa",
  gold: "#fbbf24",
  forex: "#67e8f9",
  real_estate: "#4ade80",
  vehicle: "#94a3b8",
  cash: "#cbd5e1",
  other: "#6b7280",
};

export default function AllocationPie({ assets }: AllocationPieProps) {
  const { t } = useTranslation();

  const data = useMemo(() => {
    const byType = new Map<string, number>();
    for (const a of assets) {
      if (a.value <= 0) continue;
      byType.set(a.type, (byType.get(a.type) ?? 0) + a.value);
    }

    return Array.from(byType.entries())
      .map(([type, value]) => ({
        name: t(`assetTypes.${type}`),
        type,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [assets, t]);

  const totalValue = useMemo(
    () => data.reduce((s, d) => s + d.value, 0),
    [data],
  );

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

  if (data.length === 0) {
    return (
      <div style={cardStyle}>
        <div style={labelStyle}>{t("dashboard.assetAllocation")}</div>
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
      <div style={labelStyle}>{t("dashboard.assetAllocation")}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Donut chart */}
        <div style={{ width: 140, height: 140, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={65}
                innerRadius={38}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.type}
                    fill={TYPE_COLORS_HEX[entry.type] ?? "#6b7280"}
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
                formatter={(value) => {
                  const num = Number(value);
                  return [
                    `$${num.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${totalValue > 0 ? ((num / totalValue) * 100).toFixed(1) : 0}%)`,
                    "",
                  ];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          {data.map((entry) => {
            const pct = totalValue > 0 ? ((entry.value / totalValue) * 100).toFixed(1) : "0";
            return (
              <div
                key={entry.type}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: TYPE_COLORS_HEX[entry.type] ?? "#6b7280",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--color-text-normal)",
                    flex: 1,
                  }}
                >
                  {entry.name}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-monospace)",
                    fontSize: 12,
                    color: "var(--color-text-muted)",
                  }}
                >
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
