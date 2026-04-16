import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { Snapshot } from "@/types/snapshot";

interface NetWorthChartProps {
  snapshots: Snapshot[];
}

type TimeRange = "7D" | "30D" | "90D" | "1Y" | "All";

const RANGE_DAYS: Record<TimeRange, number | null> = {
  "7D": 7,
  "30D": 30,
  "90D": 90,
  "1Y": 365,
  All: null,
};

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatValue(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export default function NetWorthChart({ snapshots }: NetWorthChartProps) {
  const { t } = useTranslation();
  const [range, setRange] = useState<TimeRange>("30D");

  const filteredData = useMemo(() => {
    const days = RANGE_DAYS[range];
    let filtered = snapshots;
    if (days != null) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      filtered = snapshots.filter((s) => s.date >= cutoffStr);
    }
    return filtered.map((s, i) => {
      const prev = i > 0 ? filtered[i - 1] : null;
      const change = prev ? s.totalNetWorth - prev.totalNetWorth : 0;
      return {
        date: s.date,
        label: formatDateLabel(s.date),
        value: s.totalNetWorth,
        change,
      };
    });
  }, [snapshots, range]);

  const cardStyle: React.CSSProperties = {
    background: "var(--color-base-10)",
    border: "1px solid var(--color-base-20)",
    borderRadius: 8,
    padding: "20px 24px",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    color: "var(--color-text-muted)",
    fontWeight: 500,
  };

  const btnGroupStyle: React.CSSProperties = {
    display: "flex",
    gap: 4,
  };

  const ranges: TimeRange[] = ["7D", "30D", "90D", "1Y", "All"];

  if (filteredData.length === 0) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={labelStyle}>{t("dashboard.netWorthTrend")}</div>
          <div style={btnGroupStyle}>
            {ranges.map((r) => (
              <RangeButton key={r} label={r} active={range === r} onClick={() => setRange(r)} />
            ))}
          </div>
        </div>
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
          {t("dashboard.noSnapshotData")}
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={labelStyle}>{t("dashboard.netWorthTrend")}</div>
        <div style={btnGroupStyle}>
          {ranges.map((r) => (
            <RangeButton key={r} label={r} active={range === r} onClick={() => setRange(r)} />
          ))}
        </div>
      </div>
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent-kerdos)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-accent-kerdos)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-20)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--color-text-faint)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatValue}
              tick={{ fill: "var(--color-text-faint)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip
              content={({ active, payload, label: _label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const entry = payload[0].payload as (typeof filteredData)[number];
                const changeStr =
                  entry.change !== 0
                    ? `${entry.change > 0 ? "+" : ""}$${Math.abs(entry.change).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                    : "--";
                return (
                  <div
                    style={{
                      background: "var(--color-base-00)",
                      border: "1px solid var(--color-base-20)",
                      borderRadius: 8,
                      padding: "10px 14px",
                      fontSize: 13,
                    }}
                  >
                    <div style={{ color: "var(--color-text-muted)", marginBottom: 4 }}>
                      {entry.date}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-monospace)",
                        color: "var(--color-text-normal)",
                        fontWeight: 600,
                      }}
                    >
                      ${Number(entry.value).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-monospace)",
                        color:
                          entry.change > 0
                            ? "var(--color-gain)"
                            : entry.change < 0
                              ? "var(--color-loss)"
                              : "var(--color-text-faint)",
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {changeStr}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-accent-kerdos)"
              strokeWidth={2}
              fill="url(#goldGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
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
        fontFamily: "var(--font-monospace)",
        fontSize: 11,
        fontWeight: active ? 600 : 400,
        color: active ? "var(--color-accent-kerdos)" : "var(--color-text-faint)",
        background: active ? "var(--color-accent-subtle)" : "transparent",
        border: "1px solid",
        borderColor: active ? "var(--color-accent-kerdos)" : "var(--color-base-20)",
        borderRadius: 4,
        padding: "3px 8px",
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}
