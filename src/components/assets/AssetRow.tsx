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

interface AssetRowProps {
  asset: Asset;
  price: PriceResult | null;
  baseCurrency: string;
  showBorder: boolean;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  onSelect: (asset: Asset) => void;
}

export default function AssetRow({
  asset,
  price,
  baseCurrency,
  showBorder,
  onEdit: _onEdit,
  onDelete: _onDelete,
  onSelect,
}: AssetRowProps) {
  const isManual = MANUAL_TYPES.has(asset.type);
  const typeColor = TYPE_COLOR_MAP[asset.type];

  // Determine unit price
  let unitPrice = 0;
  let priceCurrency = baseCurrency;
  if (isManual && asset.manualPrice != null) {
    unitPrice = asset.manualPrice;
    priceCurrency = asset.costCurrency;
  } else if (price) {
    unitPrice = price.price;
    priceCurrency = price.currency;
  }

  const totalValueRaw = unitPrice * asset.quantity;
  const totalValue = convertCurrency(totalValueRaw, priceCurrency, baseCurrency);

  // Gain/loss
  let pnlAmount: number | null = null;
  let pnlPercent: number | null = null;
  if (asset.costPrice != null && asset.costPrice > 0) {
    const costInBase = convertCurrency(
      asset.costPrice * asset.quantity,
      asset.costCurrency,
      baseCurrency,
    );
    if (costInBase > 0) {
      pnlAmount = totalValue - costInBase;
      pnlPercent = (totalValue - costInBase) / costInBase;
    }
  }

  const monoStyle: React.CSSProperties = {
    fontFamily: "var(--font-monospace)",
    fontFeatureSettings: '"tnum"',
  };

  return (
    <div
      onClick={() => onSelect(asset)}
      style={{
        display: "grid",
        gridTemplateColumns: "80px 80px 1fr 70px 110px 120px 110px",
        alignItems: "center",
        minHeight: "var(--asset-row-height)",
        padding: "6px 12px",
        borderBottom: showBorder
          ? "1px solid var(--color-base-20)"
          : "none",
        cursor: "pointer",
        transition: "background 0.12s",
        background: "var(--color-base-05)",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "var(--color-base-15)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "var(--color-base-05)";
      }}
    >
      {/* Type badge */}
      <div>
        <span
          style={{
            display: "inline-block",
            fontSize: 11,
            textTransform: "uppercase",
            padding: "2px 6px",
            borderRadius: 4,
            border: `1px solid ${typeColor}`,
            background: `${typeColor}15`,
            color: typeColor,
            fontWeight: 600,
            letterSpacing: "0.03em",
            whiteSpace: "nowrap",
          }}
        >
          {TYPE_LABEL_MAP[asset.type]}
        </span>
      </div>

      {/* Ticker */}
      <div
        style={{
          ...monoStyle,
          fontSize: 13,
          fontWeight: 600,
          color: "var(--color-text-normal)",
        }}
      >
        {asset.ticker ?? "\u2014"}
      </div>

      {/* Name + cost basis on second line */}
      <div style={{ overflow: "hidden", lineHeight: 1.3 }}>
        <div
          style={{
            fontSize: 13,
            color: "var(--color-text-normal)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {asset.name}
          {isManual && asset.manualPriceUpdatedAt && (
            <span
              style={{
                fontSize: 11,
                color: "var(--color-manual)",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
              title={`Manual - updated ${relativeTime(new Date(asset.manualPriceUpdatedAt))}`}
            >
              {"\u26A0\uFE0F"}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--color-text-faint)",
            marginTop: 1,
          }}
        >
          {asset.costPrice != null && (
            <span>
              Cost: {formatCurrency(asset.costPrice, asset.costCurrency)}
            </span>
          )}
        </div>
      </div>

      {/* Quantity */}
      <div
        style={{
          ...monoStyle,
          fontSize: 12,
          color: "var(--color-text-muted)",
          textAlign: "right",
        }}
      >
        x{asset.quantity}
      </div>

      {/* Unit price */}
      <div
        style={{
          ...monoStyle,
          fontSize: 12,
          color: "var(--color-text-muted)",
          textAlign: "right",
        }}
      >
        {unitPrice > 0
          ? formatCurrency(unitPrice, priceCurrency)
          : "\u2014"}
      </div>

      {/* Total value */}
      <div
        style={{
          ...monoStyle,
          fontSize: 13,
          fontWeight: 600,
          color: "var(--color-text-normal)",
          textAlign: "right",
        }}
      >
        {formatCurrency(totalValue, baseCurrency)}
      </div>

      {/* P&L */}
      <div
        style={{
          ...monoStyle,
          fontSize: 12,
          textAlign: "right",
          lineHeight: 1.3,
        }}
      >
        {pnlAmount !== null && pnlPercent !== null ? (
          <>
            <div
              style={{
                color:
                  pnlAmount >= 0
                    ? "var(--color-gain)"
                    : "var(--color-loss)",
                fontWeight: 500,
              }}
            >
              {pnlAmount >= 0 ? "+" : ""}
              {formatCurrency(Math.abs(pnlAmount), baseCurrency)}{" "}
              {pnlAmount >= 0 ? "\u2191" : "\u2193"}
            </div>
            <div
              style={{
                fontSize: 11,
                color:
                  pnlAmount >= 0
                    ? "var(--color-gain)"
                    : "var(--color-loss)",
              }}
            >
              {formatPercent(pnlPercent)}
            </div>
          </>
        ) : (
          <span style={{ color: "var(--color-text-faint)" }}>{"\u2014"}</span>
        )}
      </div>
    </div>
  );
}
