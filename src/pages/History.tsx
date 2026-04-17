import { useRef, useState, useMemo } from "react";
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
import { useSnapshots } from "@/hooks/useSnapshots";
import { useAssets } from "@/hooks/useAssets";
import { useSettings } from "@/stores/settingsStore";
import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  exportToCSV,
  exportToJSON,
  parseImportJSON,
  downloadFile,
} from "@/utils/export";
import { db } from "@/db";

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

function formatAxisValue(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export default function History() {
  const { t } = useTranslation();
  const { snapshots, isLoading } = useSnapshots(365 * 5); // load up to 5 years
  const { assets } = useAssets();
  const { settings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [range, setRange] = useState<TimeRange>("30D");

  // Filter snapshots by range
  const filteredSnapshots = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (days == null) return snapshots;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return snapshots.filter((s) => s.date >= cutoffStr);
  }, [snapshots, range]);

  // Chart data
  const chartData = useMemo(() => {
    return filteredSnapshots.map((s, i) => {
      const prev = i > 0 ? filteredSnapshots[i - 1] : null;
      const change = prev ? s.totalNetWorth - prev.totalNetWorth : 0;
      return {
        date: s.date,
        label: formatDateLabel(s.date),
        value: s.totalNetWorth,
        change,
      };
    });
  }, [filteredSnapshots]);

  // Table rows with change
  const tableRows = useMemo(() => {
    const withChange = filteredSnapshots.map((s, i) => {
      const prev = i > 0 ? filteredSnapshots[i - 1] : null;
      const change = prev ? s.totalNetWorth - prev.totalNetWorth : 0;
      const changePercent =
        prev && prev.totalNetWorth !== 0
          ? (change / prev.totalNetWorth) * 100
          : 0;
      return { ...s, change, changePercent };
    });
    return [...withChange].reverse();
  }, [filteredSnapshots]);

  function handleExportCSV() {
    const csv = exportToCSV(filteredSnapshots);
    downloadFile(csv, `kerdos-history-${formatDate(new Date())}.csv`, "text/csv");
  }

  function handleExportJSON() {
    const json = exportToJSON({ assets, snapshots: filteredSnapshots });
    downloadFile(
      json,
      `kerdos-export-${formatDate(new Date())}.json`,
      "application/json",
    );
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = parseImportJSON(text);

      for (const asset of data.assets) {
        await db.assets.put(asset);
      }
      for (const snapshot of data.snapshots) {
        await db.snapshots.put(snapshot);
      }

      alert(`Imported ${data.assets.length} assets and ${data.snapshots.length} snapshots.`);
    } catch (err) {
      alert(
        `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const ranges: TimeRange[] = ["7D", "30D", "90D", "1Y", "All"];

  const cardStyle: React.CSSProperties = {
    background: "var(--color-base-10)",
    border: "1px solid var(--color-base-20)",
    borderRadius: 8,
    padding: "20px 24px",
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 0",
          color: "var(--color-text-muted)",
        }}
      >
        {t("history.loading")}
      </div>
    );
  }

  return (
    <div style={{ background: "var(--color-base-05)", minHeight: "100%", padding: 24 }}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "var(--color-text-normal)",
            margin: 0,
          }}
        >
          {t("history.title")}
        </h1>
        <div style={{ display: "flex", gap: 4 }}>
          {ranges.map((r) => (
            <RangeButton key={r} label={r} active={range === r} onClick={() => setRange(r)} />
          ))}
        </div>
      </div>

      {/* Export buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <ExportButton label={`\u{1F4E5} ${t("history.exportCSV")}`} onClick={handleExportCSV} />
        <ExportButton label={`\u{1F4E5} ${t("history.exportJSON")}`} onClick={handleExportJSON} />
        <ExportButton
          label={`\u{1F4E4} ${t("history.importJSON")}`}
          onClick={() => fileInputRef.current?.click()}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={handleImport}
        />
      </div>

      {filteredSnapshots.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "64px 0",
            color: "var(--color-text-muted)",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>{t("history.noSnapshots")}</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>{t("history.snapshotsAutoCreated")}</p>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="histGoldGradient" x1="0" y1="0" x2="0" y2="1">
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
                    tickFormatter={formatAxisValue}
                    tick={{ fill: "var(--color-text-faint)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const entry = payload[0].payload as (typeof chartData)[number];
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
                    fill="url(#histGoldGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Snapshot History Table */}
          <div style={{ marginBottom: 16 }}>
            <h2
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--color-text-normal)",
                margin: "0 0 12px 0",
              }}
            >
              {t("history.snapshotHistory", "Snapshot History")}
            </h2>
          </div>
          <div style={cardStyle}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--color-base-20)",
                  }}
                >
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      fontWeight: 500,
                      color: "var(--color-text-muted)",
                      fontSize: 12,
                    }}
                  >
                    {t("history.date")}
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "8px 12px",
                      fontWeight: 500,
                      color: "var(--color-text-muted)",
                      fontSize: 12,
                    }}
                  >
                    {t("history.netWorth")}
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "8px 12px",
                      fontWeight: 500,
                      color: "var(--color-text-muted)",
                      fontSize: 12,
                    }}
                  >
                    {t("history.dailyChange", "Change")}
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "8px 12px",
                      fontWeight: 500,
                      color: "var(--color-text-muted)",
                      fontSize: 12,
                    }}
                  >
                    {t("history.changePercent", "Change %")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, idx) => {
                  const changeColor =
                    row.change > 0
                      ? "var(--color-gain)"
                      : row.change < 0
                        ? "var(--color-loss)"
                        : "var(--color-text-faint)";
                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom:
                          idx < tableRows.length - 1
                            ? "1px solid var(--color-base-15)"
                            : "none",
                      }}
                    >
                      <td
                        style={{
                          padding: "10px 12px",
                          fontFamily: "var(--font-monospace)",
                          color: "var(--color-text-normal)",
                        }}
                      >
                        {row.date}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          fontFamily: "var(--font-monospace)",
                          fontWeight: 500,
                          color: "var(--color-text-normal)",
                        }}
                      >
                        {formatCurrency(row.totalNetWorth, settings.baseCurrency)}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          fontFamily: "var(--font-monospace)",
                          color: changeColor,
                        }}
                      >
                        {row.change !== 0
                          ? `${row.change > 0 ? "+" : ""}${formatCurrency(row.change, settings.baseCurrency)}`
                          : "--"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          fontFamily: "var(--font-monospace)",
                          color: changeColor,
                        }}
                      >
                        {row.change !== 0
                          ? `${row.changePercent >= 0 ? "+" : ""}${row.changePercent.toFixed(2)}%`
                          : "--"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
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

function ExportButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12,
        color: "var(--color-text-muted)",
        background: "var(--color-base-10)",
        border: "1px solid var(--color-base-20)",
        borderRadius: 6,
        padding: "4px 12px",
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}
