import { useTranslation } from "react-i18next";

interface NetWorthCardProps {
  totalNetWorth: number;
  currency: string;
}

// Exported alongside the component for DailyChangeCard to reuse the same
// symbol table. Extracting to a separate file is not worth the churn for
// a 15-line helper used by one sibling.
// eslint-disable-next-line react-refresh/only-export-components
export function formatCurrency(value: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    CNY: "\u00a5",
    EUR: "\u20ac",
    GBP: "\u00a3",
    JPY: "\u00a5",
    HKD: "HK$",
  };
  const symbol = symbols[currency] ?? currency + " ";
  const formatted = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

export default function NetWorthCard({
  totalNetWorth,
  currency,
}: NetWorthCardProps) {
  const { t } = useTranslation();

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
    fontSize: 36,
    fontWeight: 600,
    color: "var(--color-text-normal)",
    lineHeight: 1.2,
  };

  return (
    <div style={cardStyle}>
      <div style={labelStyle}>{t("dashboard.totalNetWorth")}</div>
      <div style={valueStyle}>{formatCurrency(totalNetWorth, currency)}</div>
    </div>
  );
}

