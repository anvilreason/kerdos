import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Asset, AssetType } from "@/types/asset";
import type { PriceResult } from "@/types/price";
import AssetRow from "./AssetRow";
import { convertCurrency } from "@/utils/currency";
import { formatCurrency } from "@/utils/formatters";

const MANUAL_TYPES = new Set<AssetType>([
  "real_estate",
  "vehicle",
  "cash",
  "other",
]);

const TYPE_ORDER: AssetType[] = [
  "us_stock",
  "cn_stock",
  "etf",
  "crypto",
  "gold",
  "forex",
  "real_estate",
  "vehicle",
  "cash",
  "other",
];

function getAssetValue(
  asset: Asset,
  prices: Map<string, PriceResult>,
  baseCurrency: string,
): number {
  const isManual = MANUAL_TYPES.has(asset.type);
  let unitPrice = 0;
  let priceCurrency = baseCurrency;

  if (isManual && asset.manualPrice != null) {
    unitPrice = asset.manualPrice;
    priceCurrency = asset.costCurrency;
  } else if (asset.ticker && prices.has(asset.ticker)) {
    const pr = prices.get(asset.ticker)!;
    unitPrice = pr.price;
    priceCurrency = pr.currency;
  }

  return convertCurrency(unitPrice * asset.quantity, priceCurrency, baseCurrency);
}

interface AssetListProps {
  assets: Asset[];
  prices: Map<string, PriceResult>;
  baseCurrency: string;
  searchQuery: string;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  onSelect: (asset: Asset) => void;
}

export default function AssetList({
  assets,
  prices,
  baseCurrency,
  searchQuery,
  onEdit,
  onDelete,
  onSelect,
}: AssetListProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState<Set<AssetType>>(new Set());

  if (assets.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 0",
          textAlign: "center",
          color: "var(--color-text-faint)",
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 500 }}>
          {t("assetList.noAssetsYet")}
        </p>
        <p style={{ marginTop: 4, fontSize: 13 }}>
          {t("assetList.addFirstAsset")}
        </p>
      </div>
    );
  }

  // Filter assets by search
  const lowerQuery = searchQuery.toLowerCase().trim();
  const filteredAssets = lowerQuery
    ? assets.filter(
        (a) =>
          a.name.toLowerCase().includes(lowerQuery) ||
          (a.ticker && a.ticker.toLowerCase().includes(lowerQuery)),
      )
    : assets;

  // Group by type
  const groups = new Map<AssetType, Asset[]>();
  for (const asset of filteredAssets) {
    const list = groups.get(asset.type) ?? [];
    list.push(asset);
    groups.set(asset.type, list);
  }

  // Sort each group by value descending
  for (const [, list] of groups) {
    list.sort(
      (a, b) =>
        getAssetValue(b, prices, baseCurrency) -
        getAssetValue(a, prices, baseCurrency),
    );
  }

  // Compute total portfolio value
  const totalPortfolioValue = assets.reduce(
    (sum, a) => sum + getAssetValue(a, prices, baseCurrency),
    0,
  );

  // Render groups in type order
  const orderedTypes = TYPE_ORDER.filter((tp) => groups.has(tp));

  const toggleGroup = (type: AssetType) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  if (filteredAssets.length === 0) {
    return (
      <div
        style={{
          padding: "48px 0",
          textAlign: "center",
          color: "var(--color-text-faint)",
          fontSize: 13,
        }}
      >
        No assets match "{searchQuery}"
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {orderedTypes.map((type) => {
        const groupAssets = groups.get(type)!;
        const isCollapsed = collapsed.has(type);
        const groupValue = groupAssets.reduce(
          (sum, a) => sum + getAssetValue(a, prices, baseCurrency),
          0,
        );
        const pctOfPortfolio =
          totalPortfolioValue > 0
            ? (groupValue / totalPortfolioValue) * 100
            : 0;

        return (
          <section key={type}>
            {/* Group header */}
            <div
              onClick={() => toggleGroup(type)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 4,
                cursor: "pointer",
                transition: "background 0.15s",
                userSelect: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "var(--color-base-15)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "var(--color-text-faint)",
                  width: 14,
                  textAlign: "center",
                }}
              >
                {isCollapsed ? "\u25B6" : "\u25BC"}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                  flex: 1,
                }}
              >
                {t(`assetTypesPlural.${type}`)} ({groupAssets.length}{" "}
                {groupAssets.length === 1 ? "asset" : "assets"})
              </span>
              <span
                style={{
                  fontFamily: "var(--font-monospace)",
                  fontFeatureSettings: '"tnum"',
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--color-text-normal)",
                }}
              >
                {formatCurrency(groupValue, baseCurrency)}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-monospace)",
                  fontFeatureSettings: '"tnum"',
                  fontSize: 12,
                  color: "var(--color-text-faint)",
                  minWidth: 60,
                  textAlign: "right",
                }}
              >
                {pctOfPortfolio.toFixed(1)}%
              </span>
            </div>

            {/* Asset rows */}
            {!isCollapsed && (
              <div
                style={{
                  border: "1px solid var(--color-base-20)",
                  borderRadius: 6,
                  overflow: "hidden",
                  marginBottom: 8,
                }}
              >
                {groupAssets.map((asset, idx) => (
                  <AssetRow
                    key={asset.id}
                    asset={asset}
                    price={
                      asset.ticker ? prices.get(asset.ticker) ?? null : null
                    }
                    baseCurrency={baseCurrency}
                    showBorder={idx < groupAssets.length - 1}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
