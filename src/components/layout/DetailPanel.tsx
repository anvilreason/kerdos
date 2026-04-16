import type { Asset, AssetType } from "@/types/asset";
import type { PriceResult } from "@/types/price";
import { formatCurrency, formatPercent, relativeTime } from "@/utils/formatters";
import { convertCurrency } from "@/utils/currency";

const MANUAL_TYPES = new Set<AssetType>([
  "real_estate",
  "vehicle",
  "cash",
  "other",
]);

const TYPE_COLOR_MAP: Record<AssetType, string> = {
  us_stock: "var(--color-us-stock)",
  cn_stock: "var(--color-cn-stock)",
  etf: "var(--color-etf)",
  crypto: "var(--color-crypto)",
  gold: "var(--color-gold)",
  forex: "var(--color-forex)",
  real_estate: "var(--color-real-estate)",
  vehicle: "var(--color-vehicle)",
  cash: "var(--color-cash)",
  other: "var(--color-other)",
};

const TYPE_LABEL_MAP: Record<AssetType, string> = {
  us_stock: "US Stock",
  cn_stock: "CN Stock",
  etf: "ETF",
  crypto: "Crypto",
  gold: "Gold",
  forex: "Forex",
  real_estate: "Real Estate",
  vehicle: "Vehicle",
  cash: "Cash",
  other: "Other",
};

interface DetailPanelProps {
  asset: Asset | null;
  price: PriceResult | null;
  baseCurrency: string;
  onClose: () => void;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
}

const panelStyle: React.CSSProperties = {
  width: "var(--detail-panel-width)",
  minWidth: "var(--detail-panel-width)",
  height: "100%",
  background: "var(--color-base-10)",
  borderLeft: "1px solid var(--color-base-20)",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  fontFamily: "var(--font-interface)",
};

const headerStyle: React.CSSProperties = {
  padding: "16px 14px 12px",
  borderBottom: "1px solid var(--color-base-20)",
};

const sectionStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid var(--color-base-20)",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "4px 0",
  fontSize: 13,
};

const labelStyle: React.CSSProperties = {
  color: "var(--color-text-muted)",
  fontSize: 12,
};

const valueStyle: React.CSSProperties = {
  color: "var(--color-text-normal)",
  fontFamily: "var(--font-monospace)",
  fontFeatureSettings: '"tnum"',
  fontSize: 13,
};

const badgeStyle = (color: string): React.CSSProperties => ({
  display: "inline-block",
  fontSize: 11,
  textTransform: "uppercase",
  padding: "2px 6px",
  borderRadius: 4,
  border: `1px solid ${color}`,
  background: `${color}15`,
  color,
  fontWeight: 600,
  letterSpacing: "0.03em",
  marginRight: 6,
});

const btnStyle: React.CSSProperties = {
  height: 26,
  padding: "0 10px",
  border: "1px solid var(--color-base-25)",
  borderRadius: 4,
  background: "transparent",
  color: "var(--color-text-muted)",
  fontSize: 12,
  cursor: "pointer",
  transition: "background 0.15s, color 0.15s",
};

function MiniChart() {
  // Placeholder mini chart SVG
  const points = [40, 35, 42, 38, 45, 50, 48, 52, 47, 55, 53, 58, 60, 56, 62];
  const maxY = Math.max(...points);
  const minY = Math.min(...points);
  const range = maxY - minY || 1;
  const width = 260;
  const height = 60;

  const polylinePoints = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - minY) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: 60 }}
    >
      <polyline
        points={polylinePoints}
        fill="none"
        stroke="var(--color-accent-kerdos)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function DetailPanel({
  asset,
  price,
  baseCurrency,
  onClose,
  onEdit,
  onDelete,
}: DetailPanelProps) {
  if (!asset) return null;

  const isManual = MANUAL_TYPES.has(asset.type);
  const typeColor = TYPE_COLOR_MAP[asset.type];

  // Calculate values
  let unitPrice = 0;
  let priceCurrency = baseCurrency;
  let source = "N/A";

  if (isManual && asset.manualPrice != null) {
    unitPrice = asset.manualPrice;
    priceCurrency = asset.costCurrency;
    source = "Manual";
  } else if (price) {
    unitPrice = price.price;
    priceCurrency = price.currency;
    source = price.source;
  }

  const totalValueRaw = unitPrice * asset.quantity;
  const totalValue = convertCurrency(totalValueRaw, priceCurrency, baseCurrency);

  // Cost basis
  let costBasis: number | null = null;
  let pnlAmount: number | null = null;
  let pnlPercent: number | null = null;

  if (asset.costPrice != null && asset.costPrice > 0) {
    const costTotal = convertCurrency(
      asset.costPrice * asset.quantity,
      asset.costCurrency,
      baseCurrency,
    );
    costBasis = costTotal;
    pnlAmount = totalValue - costTotal;
    pnlPercent = costTotal > 0 ? (totalValue - costTotal) / costTotal : null;
  }

  const handleHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLElement).style.background = "var(--color-base-15)";
    (e.currentTarget as HTMLElement).style.color = "var(--color-text-normal)";
  };
  const handleLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLElement).style.background = "transparent";
    (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
  };

  return (
    <aside style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--color-text-normal)",
                fontFamily: "var(--font-monospace)",
              }}
            >
              {asset.ticker ?? asset.name}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--color-text-muted)",
                marginTop: 2,
              }}
            >
              {asset.name}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              style={btnStyle}
              onClick={() => onEdit(asset)}
              onMouseEnter={handleHover}
              onMouseLeave={handleLeave}
            >
              Edit
            </button>
            <button
              style={{
                ...btnStyle,
                color: "var(--color-loss)",
                borderColor: "var(--color-loss)",
              }}
              onClick={() => onDelete(asset)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "var(--color-loss-bg)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              Delete
            </button>
          </div>
        </div>
        <div style={{ marginTop: 8, display: "flex", alignItems: "center" }}>
          <span style={badgeStyle(typeColor)}>{TYPE_LABEL_MAP[asset.type]}</span>
          {asset.ticker && (
            <span
              style={{
                fontSize: 11,
                color: "var(--color-text-faint)",
                textTransform: "uppercase",
              }}
            >
              {asset.ticker}
            </span>
          )}
        </div>
      </div>

      {/* Market data */}
      <div style={sectionStyle}>
        <div style={rowStyle}>
          <span style={labelStyle}>Current Price</span>
          <span style={valueStyle}>
            {unitPrice > 0
              ? formatCurrency(unitPrice, priceCurrency)
              : "N/A"}
          </span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Holdings</span>
          <span style={valueStyle}>
            x{asset.quantity}
          </span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Market Value</span>
          <span style={{ ...valueStyle, fontWeight: 600 }}>
            {formatCurrency(totalValue, baseCurrency)}
          </span>
        </div>
      </div>

      {/* Cost basis & P&L */}
      {costBasis !== null && (
        <div style={sectionStyle}>
          <div style={rowStyle}>
            <span style={labelStyle}>Cost Basis</span>
            <span style={valueStyle}>
              {formatCurrency(costBasis, baseCurrency)}
              {asset.costPrice != null && (
                <span style={{ color: "var(--color-text-faint)", fontSize: 11 }}>
                  {" "}
                  ({formatCurrency(asset.costPrice, asset.costCurrency)}/share)
                </span>
              )}
            </span>
          </div>
          {pnlAmount !== null && pnlPercent !== null && (
            <div style={rowStyle}>
              <span style={labelStyle}>Unrealized P&L</span>
              <span
                style={{
                  ...valueStyle,
                  color:
                    pnlAmount >= 0
                      ? "var(--color-gain)"
                      : "var(--color-loss)",
                  fontWeight: 600,
                }}
              >
                {pnlAmount >= 0 ? "+" : ""}
                {formatCurrency(Math.abs(pnlAmount), baseCurrency)}{" "}
                ({formatPercent(pnlPercent)}){" "}
                {pnlAmount >= 0 ? "\u2191" : "\u2193"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Manual asset warning */}
      {isManual && (
        <div style={sectionStyle}>
          {asset.manualPrice != null && (
            <div style={rowStyle}>
              <span style={labelStyle}>Estimated Value</span>
              <span style={valueStyle}>
                {formatCurrency(
                  asset.manualPrice * asset.quantity,
                  asset.costCurrency,
                )}
              </span>
            </div>
          )}
          {priceCurrency !== baseCurrency && (
            <div style={rowStyle}>
              <span style={labelStyle}>In {baseCurrency}</span>
              <span style={valueStyle}>
                {formatCurrency(totalValue, baseCurrency)}
              </span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 6,
              padding: "6px 8px",
              borderRadius: 4,
              background: "var(--color-manual-bg)",
              color: "var(--color-manual)",
              fontSize: 12,
            }}
          >
            <span style={{ fontSize: 14 }}>{"\u26A0\uFE0F"}</span>
            <span>
              Manual
              {asset.manualPriceUpdatedAt &&
                ` \u00B7 Last updated ${relativeTime(new Date(asset.manualPriceUpdatedAt))}`}
            </span>
          </div>
        </div>
      )}

      {/* Mini chart */}
      {!isManual && (
        <div style={sectionStyle}>
          <div
            style={{
              fontSize: 12,
              color: "var(--color-text-muted)",
              marginBottom: 8,
            }}
          >
            Price (30 days)
          </div>
          <MiniChart />
        </div>
      )}

      {/* Source info */}
      <div style={sectionStyle}>
        <div
          style={{
            fontSize: 11,
            color: "var(--color-text-faint)",
          }}
        >
          Source: {source}
        </div>
        {price && (
          <div
            style={{
              fontSize: 11,
              color: "var(--color-text-faint)",
              marginTop: 2,
            }}
          >
            Updated{" "}
            {relativeTime(new Date(price.timestamp))}
          </div>
        )}
      </div>

      {/* Notes */}
      {asset.notes && (
        <div style={sectionStyle}>
          <div
            style={{
              fontSize: 12,
              color: "var(--color-text-muted)",
              marginBottom: 4,
            }}
          >
            Notes
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--color-text-normal)",
              fontStyle: "italic",
              lineHeight: 1.5,
            }}
          >
            "{asset.notes}"
          </div>
        </div>
      )}

      {/* Close button at bottom */}
      <div
        style={{
          padding: "12px 14px",
          marginTop: "auto",
          borderTop: "1px solid var(--color-base-20)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            ...btnStyle,
            width: "100%",
            textAlign: "center",
          }}
          onMouseEnter={handleHover}
          onMouseLeave={handleLeave}
        >
          Close
        </button>
      </div>
    </aside>
  );
}
