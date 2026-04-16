import { useTranslation } from "react-i18next";
import { formatCurrency } from "./NetWorthCard";

interface DailyChangeCardProps {
  change: number;
  changePercent: number;
  currency: string;
}

export default function DailyChangeCard({
  change,
  changePercent,
  currency,
}: DailyChangeCardProps) {
  const { t } = useTranslation();

  const isPositive = change > 0;
  const isNegative = change < 0;

  const sign = isPositive ? "+" : "";
  const formattedChange = `${sign}${formatCurrency(change, currency)}`;
  const formattedPercent = `${sign}${changePercent.toFixed(2)}%`;
  const arrow = isPositive ? " \u2191" : isNegative ? " \u2193" : "";

  const changeColor = isPositive
    ? "var(--color-gain)"
    : isNegative
      ? "var(--color-loss)"
      : "var(--color-text-muted)";

  const badgeBg = isPositive
    ? "var(--color-gain-bg)"
    : isNegative
      ? "var(--color-loss-bg)"
      : "transparent";

  const cardStyle: React.CSSProperties = {
    background: "var(--color-base-10)",
    border: "1px solid var(--color-base-20)",
    borderRadius: 8,
    padding: "20px 24px",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    color: "var(--color-text-muted)",
    marginBottom: 8,
    fontWeight: 500,
  };

  const valueStyle: React.CSSProperties = {
    fontFamily: "var(--font-monospace)",
    fontSize: 24,
    fontWeight: 600,
    color: changeColor,
    lineHeight: 1.2,
    marginBottom: 8,
  };

  const badgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    fontFamily: "var(--font-monospace)",
    fontSize: 14,
    fontWeight: 500,
    color: changeColor,
    background: badgeBg,
    borderRadius: 4,
    padding: "2px 8px",
  };

  return (
    <div style={cardStyle}>
      <div style={labelStyle}>{t("dashboard.todaysChange")}</div>
      <div style={valueStyle}>{formattedChange}</div>
      {change !== 0 && (
        <span style={badgeStyle}>
          {formattedPercent}
          {arrow}
        </span>
      )}
    </div>
  );
}
