import { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAssets } from "@/hooks/useAssets";
import { usePrices } from "@/hooks/usePrices";
import { useNetWorth } from "@/hooks/useNetWorth";
import type { Asset, AssetType } from "@/types/asset";
import type { PriceResult } from "@/types/price";

/* ── helpers ── */

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  us_stock: "Stocks",
  cn_stock: "CN Stocks",
  etf: "ETFs",
  crypto: "Crypto",
  gold: "Gold",
  forex: "Forex",
  real_estate: "Real Est.",
  vehicle: "Vehicles",
  cash: "Cash",
  other: "Other",
};

const ASSET_TYPE_ORDER: AssetType[] = [
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

interface AssetGroup {
  type: AssetType;
  label: string;
  assets: Asset[];
  totalValue: number;
}

function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n >= 1000 ? 0 : 2,
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  });
}

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(2);
}

function getAssetValue(
  asset: Asset,
  prices: Map<string, PriceResult>,
): number {
  let unitPrice = 0;
  if (asset.ticker) {
    const pr = prices.get(asset.ticker);
    if (pr) unitPrice = pr.price;
  }
  if (unitPrice === 0 && asset.manualPrice != null) {
    unitPrice = asset.manualPrice;
  }
  return unitPrice * asset.quantity;
}

function getDailyChangePct(
  asset: Asset,
  _prices: Map<string, PriceResult>,
): number | null {
  // We don't have daily change data per-asset from PriceResult,
  // so we return null for assets without ticker (manual) and 0 for others.
  // In a real implementation you'd get this from the price service.
  if (!asset.ticker) return null;
  // Placeholder: we don't have per-asset daily change in PriceResult.
  // Return null so UI shows nothing for now.
  return null;
}

/* ── nav items ── */

const NAV_ITEMS = [
  { to: "/app", label: "Dashboard", emoji: "\u{1F4CA}" },
  { to: "/app/assets", label: "All Assets", emoji: "\u{1F4BC}" },
  { to: "/app/history", label: "History", emoji: "\u{1F4C8}" },
  { to: "/app/settings", label: "Settings", emoji: "\u2699\uFE0F" },
] as const;

/* ── styles ── */

const sidebarStyle: React.CSSProperties = {
  width: "var(--sidebar-width)",
  minWidth: "var(--sidebar-width)",
  height: "100%",
  background: "var(--color-base-10)",
  display: "flex",
  flexDirection: "column",
  borderRight: "1px solid var(--color-base-20)",
  overflow: "hidden",
  fontFamily: "var(--font-interface)",
  userSelect: "none",
};

const portfolioHeaderStyle: React.CSSProperties = {
  padding: "16px 14px 12px",
  borderBottom: "1px solid var(--color-base-20)",
};

const navSectionStyle: React.CSSProperties = {
  padding: "8px 8px 4px",
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: "var(--color-base-20)",
  margin: "4px 12px",
};

const assetTreeStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "4px 8px",
};

const footerStyle: React.CSSProperties = {
  padding: "8px",
  borderTop: "1px solid var(--color-base-20)",
  display: "flex",
  gap: 4,
};

/* ── component ── */

interface SidebarProps {
  selectedAssetId?: string | null;
  onSelectAsset?: (id: string | null) => void;
  onAddAsset?: () => void;
}

export default function Sidebar({
  selectedAssetId,
  onSelectAsset,
  onAddAsset,
}: SidebarProps) {
  const { pathname } = useLocation();
  const { assets } = useAssets();
  const { prices } = usePrices(assets);
  const { totalNetWorth, dailyChange, dailyChangePercent } = useNetWorth();

  // Group assets by type
  const groups = useMemo<AssetGroup[]>(() => {
    const map = new Map<AssetType, Asset[]>();
    for (const a of assets) {
      const arr = map.get(a.type) ?? [];
      arr.push(a);
      map.set(a.type, arr);
    }
    return ASSET_TYPE_ORDER.filter((t) => map.has(t)).map((t) => {
      const groupAssets = map.get(t)!;
      const totalValue = groupAssets.reduce(
        (sum, a) => sum + getAssetValue(a, prices),
        0,
      );
      return {
        type: t,
        label: ASSET_TYPE_LABELS[t],
        assets: groupAssets,
        totalValue,
      };
    });
  }, [assets, prices]);

  // Track expanded groups
  const [expanded, setExpanded] = useState<Set<AssetType>>(() => {
    // Expand first two groups by default
    const initial = new Set<AssetType>();
    ASSET_TYPE_ORDER.slice(0, 2).forEach((t) => initial.add(t));
    return initial;
  });

  const toggleGroup = (type: AssetType) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const changeColor =
    dailyChange >= 0 ? "var(--color-gain)" : "var(--color-loss)";
  const changeSign = dailyChange >= 0 ? "+" : "";

  return (
    <aside style={sidebarStyle}>
      {/* Portfolio Header */}
      <div style={portfolioHeaderStyle}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--color-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 4,
          }}
        >
          My Wealth
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--color-text-normal)",
            fontFamily: "var(--font-monospace)",
            lineHeight: 1.2,
          }}
        >
          {formatCurrency(totalNetWorth)}
        </div>
        <div
          style={{
            fontSize: 12,
            color: changeColor,
            marginTop: 2,
            fontFamily: "var(--font-monospace)",
          }}
        >
          {changeSign}${formatCompact(Math.abs(dailyChange))}
          {" \u00B7 "}
          {changeSign}
          {dailyChangePercent.toFixed(2)}% today
        </div>
      </div>

      {/* Navigation */}
      <nav style={navSectionStyle}>
        {NAV_ITEMS.map(({ to, label, emoji }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                height: "var(--nav-item-height)",
                padding: "0 8px",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active
                  ? "var(--color-text-accent)"
                  : "var(--color-text-normal)",
                background: active ? "var(--color-nav-active-bg)" : "transparent",
                borderLeft: active
                  ? "2px solid var(--color-nav-active-border)"
                  : "2px solid transparent",
                textDecoration: "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!active)
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--color-base-15)";
              }}
              onMouseLeave={(e) => {
                if (!active)
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
              }}
            >
              <span style={{ fontSize: 14 }}>{emoji}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div style={dividerStyle} />

      {/* Asset Tree */}
      <div style={assetTreeStyle}>
        {groups.map((group) => {
          const isExpanded = expanded.has(group.type);
          const hasManual = group.assets.some((a) => !a.ticker);
          return (
            <div key={group.type} style={{ marginBottom: 2 }}>
              {/* Group header */}
              <div
                onClick={() => toggleGroup(group.type)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: 26,
                  padding: "0 4px",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  transition: "background 0.15s",
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
                <span style={{ fontSize: 10, width: 12, textAlign: "center" }}>
                  {isExpanded ? "\u25BC" : "\u25B6"}
                </span>
                <span style={{ flex: 1 }}>
                  {group.label} ({group.assets.length})
                  {hasManual && (
                    <span style={{ marginLeft: 4 }} title="Contains manual assets">
                      \u26A0\uFE0F
                    </span>
                  )}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-monospace)",
                    fontSize: 11,
                    color: "var(--color-text-faint)",
                  }}
                >
                  {formatCurrency(group.totalValue)}
                </span>
              </div>

              {/* Asset leaves */}
              {isExpanded &&
                group.assets.map((asset) => {
                  getAssetValue(asset, prices);
                  const changePct = getDailyChangePct(asset, prices);
                  const isManual = !asset.ticker;
                  const isSelected = selectedAssetId === asset.id;

                  return (
                    <div
                      key={asset.id}
                      onClick={() => onSelectAsset?.(asset.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        height: 24,
                        padding: "0 4px 0 24px",
                        borderRadius: 4,
                        fontSize: 12.5,
                        color: "var(--color-text-normal)",
                        cursor: "pointer",
                        background: isSelected
                          ? "var(--color-accent-subtle)"
                          : "transparent",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected)
                          (e.currentTarget as HTMLElement).style.background =
                            "var(--color-base-15)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected)
                          (e.currentTarget as HTMLElement).style.background =
                            "transparent";
                      }}
                    >
                      {isManual && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "var(--color-manual)",
                            flexShrink: 0,
                          }}
                          title="Manual price"
                        />
                      )}
                      <span
                        style={{
                          fontFamily: "var(--font-monospace)",
                          fontWeight: 500,
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {asset.ticker ?? asset.name}
                        <span
                          style={{
                            color: "var(--color-text-faint)",
                            fontWeight: 400,
                          }}
                        >
                          {" "}
                          x{asset.quantity}
                        </span>
                      </span>
                      {changePct !== null && (
                        <span
                          style={{
                            fontFamily: "var(--font-monospace)",
                            fontSize: 11,
                            color:
                              changePct >= 0
                                ? "var(--color-gain)"
                                : "var(--color-loss)",
                          }}
                        >
                          {changePct >= 0 ? "+" : ""}
                          {changePct.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
        {groups.length === 0 && (
          <div
            style={{
              padding: "16px 8px",
              fontSize: 12,
              color: "var(--color-text-faint)",
              textAlign: "center",
            }}
          >
            No assets yet
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={footerStyle}>
        <button
          onClick={onAddAsset}
          style={{
            flex: 1,
            height: 28,
            border: "1px solid var(--color-base-25)",
            borderRadius: 4,
            background: "transparent",
            color: "var(--color-text-muted)",
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "var(--color-base-15)";
            (e.currentTarget as HTMLElement).style.color =
              "var(--color-text-normal)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color =
              "var(--color-text-muted)";
          }}
        >
          <span>\u2295</span> Add Asset
        </button>
        <button
          style={{
            width: 28,
            height: 28,
            border: "1px solid var(--color-base-25)",
            borderRadius: 4,
            background: "transparent",
            color: "var(--color-text-muted)",
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "var(--color-base-15)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
          title="Import"
        >
          \u2193
        </button>
        <button
          style={{
            width: 28,
            height: 28,
            border: "1px solid var(--color-base-25)",
            borderRadius: 4,
            background: "transparent",
            color: "var(--color-text-muted)",
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "var(--color-base-15)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
          title="Export"
        >
          \u2191
        </button>
      </div>
    </aside>
  );
}
