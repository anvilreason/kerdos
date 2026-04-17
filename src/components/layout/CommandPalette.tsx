import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Asset } from "@/types/asset";
import type { PriceResult } from "@/types/price";
import { formatCurrency } from "@/utils/formatters";
import { convertCurrency } from "@/utils/currency";
import type { AssetType } from "@/types/asset";

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

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  assets: Asset[];
  prices: Map<string, PriceResult>;
  baseCurrency: string;
  onAddAsset: () => void;
  onSelectAsset: (asset: Asset) => void;
  onExportJSON: () => void;
  onRefreshPrices: () => void;
  onTakeSnapshot: () => void;
}

interface CommandItem {
  id: string;
  type: "page" | "action" | "asset";
  label: string;
  secondary?: string;
  icon?: string;
  value?: string;
  badgeColor?: string;
  badgeLabel?: string;
  action: () => void;
}

const badgeStyle = (color: string): React.CSSProperties => ({
  display: "inline-block",
  fontSize: 10,
  textTransform: "uppercase",
  padding: "1px 5px",
  borderRadius: 3,
  border: `1px solid ${color}`,
  background: `${color}15`,
  color,
  fontWeight: 600,
  letterSpacing: "0.03em",
  marginLeft: 6,
});

export default function CommandPalette({
  open,
  onClose,
  assets,
  prices,
  baseCurrency,
  onAddAsset,
  onSelectAsset,
  onExportJSON,
  onRefreshPrices,
  onTakeSnapshot,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state when opening. Downgraded rule (set-state-in-effect) — this
  // is the standard controlled-dialog reset pattern; parent owns `open`.
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      // Focus input after mount
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build items
  const getAssetValue = useCallback(
    (asset: Asset): number => {
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
      return convertCurrency(
        unitPrice * asset.quantity,
        priceCurrency,
        baseCurrency,
      );
    },
    [prices, baseCurrency],
  );

  const pageItems: CommandItem[] = [
    {
      id: "page-dashboard",
      type: "page",
      label: "Dashboard",
      icon: "\uD83D\uDCCA",
      action: () => {
        navigate("/app");
        onClose();
      },
    },
    {
      id: "page-assets",
      type: "page",
      label: "All Assets",
      icon: "\uD83D\uDCBC",
      action: () => {
        navigate("/app/assets");
        onClose();
      },
    },
    {
      id: "page-history",
      type: "page",
      label: "History",
      icon: "\uD83D\uDCC8",
      action: () => {
        navigate("/app/history");
        onClose();
      },
    },
    {
      id: "page-settings",
      type: "page",
      label: "Settings",
      icon: "\u2699\uFE0F",
      action: () => {
        navigate("/app/settings");
        onClose();
      },
    },
  ];

  const actionItems: CommandItem[] = [
    {
      id: "action-add",
      type: "action",
      label: "Add new asset",
      icon: "\u2295",
      action: () => {
        onAddAsset();
        onClose();
      },
    },
    {
      id: "action-export",
      type: "action",
      label: "Export data as JSON",
      icon: "\u2193",
      action: () => {
        onExportJSON();
        onClose();
      },
    },
    {
      id: "action-refresh",
      type: "action",
      label: "Refresh all prices",
      icon: "\u27F3",
      action: () => {
        onRefreshPrices();
        onClose();
      },
    },
    {
      id: "action-snapshot",
      type: "action",
      label: "Take manual snapshot",
      icon: "\uD83D\uDCF8",
      action: () => {
        onTakeSnapshot();
        onClose();
      },
    },
  ];

  const assetItems: CommandItem[] = assets.map((asset) => ({
    id: `asset-${asset.id}`,
    type: "asset",
    label: asset.ticker ?? asset.name,
    secondary: asset.ticker ? asset.name : undefined,
    value: formatCurrency(getAssetValue(asset), baseCurrency),
    badgeColor: TYPE_COLOR_MAP[asset.type],
    badgeLabel: TYPE_LABEL_MAP[asset.type],
    action: () => {
      onSelectAsset(asset);
      onClose();
    },
  }));

  // Filter
  const lowerQuery = query.toLowerCase().trim();
  const filteredPages = lowerQuery
    ? pageItems.filter((i) => i.label.toLowerCase().includes(lowerQuery))
    : pageItems;
  const filteredActions = lowerQuery
    ? actionItems.filter((i) => i.label.toLowerCase().includes(lowerQuery))
    : actionItems;
  const filteredAssets = lowerQuery
    ? assetItems.filter(
        (i) =>
          i.label.toLowerCase().includes(lowerQuery) ||
          (i.secondary && i.secondary.toLowerCase().includes(lowerQuery)) ||
          (i.badgeLabel && i.badgeLabel.toLowerCase().includes(lowerQuery)),
      )
    : assetItems;

  const allItems = useMemo(
    () => [...filteredPages, ...filteredActions, ...filteredAssets],
    [filteredPages, filteredActions, filteredAssets],
  );

  // Scroll selected into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.querySelector(`[data-index="${selectedIndex}"]`);
    if (selected) {
      (selected as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, allItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (allItems[selectedIndex]) {
          allItems[selectedIndex].action();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, allItems, selectedIndex, onClose]);

  // Reset index when query changes.
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  function renderSection(
    title: string,
    items: CommandItem[],
    startIdx: number,
  ): React.ReactNode {
    if (items.length === 0) return null;

    return (
      <div key={title}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--color-text-faint)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            padding: "10px 14px 4px",
          }}
        >
          {title}
        </div>
        {items.map((item, i) => {
          const itemIdx = startIdx + i;
          const isSelected = itemIdx === selectedIndex;
          return (
            <div
              key={item.id}
              data-index={itemIdx}
              onClick={item.action}
              onMouseEnter={() => setSelectedIndex(itemIdx)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                cursor: "pointer",
                background: isSelected
                  ? "var(--color-base-00)"
                  : "transparent",
                transition: "background 0.1s",
                borderRadius: 4,
                margin: "0 4px",
              }}
            >
              {item.icon && (
                <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>
                  {item.icon}
                </span>
              )}
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: "var(--color-text-normal)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    fontFamily:
                      item.type === "asset"
                        ? "var(--font-monospace)"
                        : "inherit",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </span>
                {item.secondary && (
                  <span
                    style={{
                      color: "var(--color-text-faint)",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {"\u2013"} {item.secondary}
                  </span>
                )}
                {item.badgeColor && item.badgeLabel && (
                  <span style={badgeStyle(item.badgeColor)}>
                    {item.badgeLabel}
                  </span>
                )}
              </span>
              {item.value && (
                <span
                  style={{
                    fontFamily: "var(--font-monospace)",
                    fontFeatureSettings: '"tnum"',
                    fontSize: 12,
                    color: "var(--color-text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.value}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        paddingTop: "15vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 600,
          maxHeight: "60vh",
          background: "var(--color-base-05)",
          borderRadius: 8,
          border: "1px solid var(--color-base-20)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          alignSelf: "flex-start",
        }}
      >
        {/* Search input */}
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid var(--color-base-20)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 14, color: "var(--color-text-faint)" }}>
            {"\uD83D\uDD0D"}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assets, tickers, actions..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--color-text-normal)",
              fontSize: 14,
              fontFamily: "var(--font-interface)",
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: "var(--color-text-faint)",
              padding: "2px 6px",
              border: "1px solid var(--color-base-25)",
              borderRadius: 4,
            }}
          >
            ESC
          </span>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "4px 0",
          }}
        >
          {allItems.length === 0 ? (
            <div
              style={{
                padding: "24px 14px",
                textAlign: "center",
                color: "var(--color-text-faint)",
                fontSize: 13,
              }}
            >
              No results found
            </div>
          ) : (
            <>
              {renderSection("RECENT", filteredPages, 0)}
              {renderSection(
                "ACTIONS",
                filteredActions,
                filteredPages.length,
              )}
              {renderSection(
                "ASSETS",
                filteredAssets,
                filteredPages.length + filteredActions.length,
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
