import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Asset, AssetType } from "@/types/asset";
import type { PriceResult } from "@/types/price";
import { convertCurrency } from "@/utils/currency";
import { getAssetDisplayName } from "@/utils/assetDisplayName";
import { formatCurrency } from "./NetWorthCard";

/**
 * Holdings detail table (T-W3-01).
 *
 * One row per asset with columns: name + type badge, ticker, quantity,
 * cost price, current price, market value (base), unrealised P/L (base),
 * return %, today's change.
 *
 * Integration notes:
 *   · `prices` is the Map returned by usePrices, keyed by TICKER (not
 *     asset.id). Assets without a ticker (real_estate / vehicle / cash /
 *     other) fall back to asset.manualPrice for their current price.
 *   · PriceResult has no per-asset day-change field today, so the "Today"
 *     column always renders "—" until that is added upstream. (Explicit
 *     non-hallucination: we do not fabricate a value.)
 *   · Cost basis is optional on the Asset model; rows without costPrice
 *     show "—" for cost / P/L / return rather than printing misleading
 *     zeros.
 */
interface HoldingsTableProps {
  assets: Asset[];
  /** usePrices output — keyed by ticker. */
  prices: Map<string, PriceResult>;
  baseCurrency: string;
  /**
   * When true, hide the body and render a skeleton. Intended for the
   * window where assets have loaded but prices are still streaming in.
   */
  pricesLoading?: boolean;
}

type SortKey = "value" | "returnPct" | "dayChange";
type SortDir = "asc" | "desc";

const INITIAL_VISIBLE = 10;

// Asset types that are "manual" — no ticker lookup, no P/L math unless
// the user supplied cost basis.
const MANUAL_TYPES = new Set<AssetType>([
  "real_estate",
  "vehicle",
  "cash",
  "other",
]);

// Re-use the same colour palette as AllocationPie for consistency.
const TYPE_BADGE_COLORS: Record<string, string> = {
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

interface Row {
  asset: Asset;
  isManual: boolean;
  /** Current unit price in the price's native currency; null if unknown. */
  currentPrice: number | null;
  currentCurrency: string | null;
  /** Market value converted to base currency. */
  marketValueBase: number;
  /** Unrealised P/L in base currency; null when cost basis is unknown. */
  pnlBase: number | null;
  /** Return as a fraction (pnl / cost); null when cost basis is unknown. */
  returnPct: number | null;
}

export default function HoldingsTable({
  assets,
  prices,
  baseCurrency,
  pricesLoading,
}: HoldingsTableProps) {
  const { t } = useTranslation();

  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showAll, setShowAll] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<AssetType>>(
    () => new Set(),
  );

  // --- Derive one row per asset --------------------------------------------
  const rows = useMemo<Row[]>(() => {
    return assets.map<Row>((asset) => {
      const isManual = !asset.ticker || MANUAL_TYPES.has(asset.type);

      let currentPrice: number | null = null;
      let currentCurrency: string | null = null;

      if (asset.ticker) {
        const pr = prices.get(asset.ticker);
        if (pr) {
          currentPrice = pr.price;
          currentCurrency = pr.currency;
        }
      }
      // Fall back to manualPrice when no live quote is available. Manual
      // price is assumed to be stored in costCurrency (same as AssetForm).
      if (currentPrice === null && asset.manualPrice != null) {
        currentPrice = asset.manualPrice;
        currentCurrency = asset.costCurrency;
      }

      const quantity = asset.quantity;
      const marketValueNative =
        currentPrice !== null ? currentPrice * quantity : 0;
      const marketValueBase =
        currentPrice !== null && currentCurrency
          ? convertCurrency(marketValueNative, currentCurrency, baseCurrency)
          : 0;

      let pnlBase: number | null = null;
      let returnPct: number | null = null;

      if (
        asset.costPrice != null &&
        asset.costPrice > 0 &&
        currentPrice !== null &&
        currentCurrency !== null &&
        quantity > 0
      ) {
        const costBaseUnit = convertCurrency(
          asset.costPrice,
          asset.costCurrency,
          baseCurrency,
        );
        const priceBaseUnit = convertCurrency(
          currentPrice,
          currentCurrency,
          baseCurrency,
        );
        const costTotalBase = costBaseUnit * quantity;
        pnlBase = (priceBaseUnit - costBaseUnit) * quantity;
        if (costTotalBase !== 0) {
          returnPct = pnlBase / costTotalBase;
        }
      }

      return {
        asset,
        isManual,
        currentPrice,
        currentCurrency,
        marketValueBase,
        pnlBase,
        returnPct,
      };
    });
  }, [assets, prices, baseCurrency]);

  // --- Group by asset type, apply sort within group ------------------------
  const groups = useMemo(() => {
    const byType = new Map<AssetType, Row[]>();
    for (const r of rows) {
      const list = byType.get(r.asset.type);
      if (list) list.push(r);
      else byType.set(r.asset.type, [r]);
    }

    // Sort each group's rows by the active sort key.
    const cmp = (a: Row, b: Row): number => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      // null-last regardless of direction
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      const diff = av - bv;
      return sortDir === "asc" ? diff : -diff;
    };

    const sortedGroups: Array<{
      type: AssetType;
      rows: Row[];
      total: number;
    }> = [];
    for (const [type, list] of byType) {
      const sorted = [...list].sort(cmp);
      const total = sorted.reduce((s, r) => s + r.marketValueBase, 0);
      sortedGroups.push({ type, rows: sorted, total });
    }
    // Groups sorted by combined market value descending — most significant
    // bucket surfaces first regardless of per-row sort direction.
    sortedGroups.sort((a, b) => b.total - a.total);
    return sortedGroups;
  }, [rows, sortKey, sortDir]);

  const totalRows = rows.length;
  const visibleLimit = showAll ? Infinity : INITIAL_VISIBLE;

  // Walk groups in order and cap the total number of data rows shown
  // before "Show all". Group headers are always visible even when all of
  // that group's rows are beyond the cap — otherwise the user can't see
  // what's being hidden.
  const renderedSections = useMemo(() => {
    let shown = 0;
    let hidden = 0;
    const sections = groups.map((g) => {
      const collapsed = collapsedGroups.has(g.type);
      const visibleRows: Row[] = [];
      if (!collapsed) {
        for (const r of g.rows) {
          if (shown < visibleLimit) {
            visibleRows.push(r);
            shown += 1;
          } else {
            hidden += 1;
          }
        }
      }
      return { ...g, collapsed, visibleRows };
    });
    return { sections, hidden };
  }, [groups, collapsedGroups, visibleLimit]);

  // --- Empty / loading -----------------------------------------------------
  if (assets.length === 0) {
    return (
      <Shell>
        <Header title={t("dashboard.holdings.title")} />
        <div
          style={{
            color: "var(--color-text-faint)",
            fontSize: 13,
            padding: "20px 0",
          }}
        >
          {t("dashboard.holdings.empty")}
        </div>
      </Shell>
    );
  }

  // --- Render --------------------------------------------------------------
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const toggleGroup = (type: AssetType) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  return (
    <Shell>
      <Header title={t("dashboard.holdings.title")} />
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr>
              <Th align="left">{t("dashboard.holdings.columns.name")}</Th>
              <Th align="left">{t("dashboard.holdings.columns.ticker")}</Th>
              <Th align="right">{t("dashboard.holdings.columns.quantity")}</Th>
              <Th align="right">{t("dashboard.holdings.columns.cost")}</Th>
              <Th align="right">{t("dashboard.holdings.columns.price")}</Th>
              <Th
                align="right"
                sortable
                active={sortKey === "value"}
                dir={sortDir}
                onClick={() => toggleSort("value")}
              >
                {t("dashboard.holdings.columns.value")}
              </Th>
              <Th align="right">{t("dashboard.holdings.columns.pnl")}</Th>
              <Th
                align="right"
                sortable
                active={sortKey === "returnPct"}
                dir={sortDir}
                onClick={() => toggleSort("returnPct")}
              >
                {t("dashboard.holdings.columns.return")}
              </Th>
              <Th
                align="right"
                sortable
                active={sortKey === "dayChange"}
                dir={sortDir}
                onClick={() => toggleSort("dayChange")}
              >
                {t("dashboard.holdings.columns.dayChange")}
              </Th>
            </tr>
          </thead>
          <tbody>
            {renderedSections.sections.map((section) => (
              <GroupBlock
                key={section.type}
                type={section.type}
                collapsed={section.collapsed}
                total={section.total}
                baseCurrency={baseCurrency}
                onToggle={() => toggleGroup(section.type)}
                rowCount={section.rows.length}
                visibleRows={section.visibleRows}
                pricesLoading={pricesLoading}
              />
            ))}
          </tbody>
        </table>
      </div>
      {totalRows > INITIAL_VISIBLE && (
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            style={{
              fontFamily: "var(--font-monospace)",
              fontSize: 12,
              color: "var(--color-accent-kerdos)",
              background: "transparent",
              border: "1px solid var(--color-base-20)",
              borderRadius: 4,
              padding: "4px 12px",
              cursor: "pointer",
            }}
          >
            {showAll
              ? t("dashboard.holdings.showLess")
              : t("dashboard.holdings.showAll", {
                  count: renderedSections.hidden,
                })}
          </button>
        </div>
      )}
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--color-base-10)",
        border: "1px solid var(--color-base-20)",
        borderRadius: 8,
        padding: "20px 24px",
      }}
    >
      {children}
    </div>
  );
}

function Header({ title }: { title: string }) {
  return (
    <div
      style={{
        fontSize: 13,
        color: "var(--color-text-muted)",
        marginBottom: 12,
        fontWeight: 500,
      }}
    >
      {title}
    </div>
  );
}

function Th({
  children,
  align,
  sortable,
  active,
  dir,
  onClick,
}: {
  children: React.ReactNode;
  align: "left" | "right";
  sortable?: boolean;
  active?: boolean;
  dir?: SortDir;
  onClick?: () => void;
}) {
  const base: React.CSSProperties = {
    textAlign: align,
    padding: "6px 8px",
    fontWeight: 500,
    fontSize: 11,
    color: "var(--color-text-muted)",
    borderBottom: "1px solid var(--color-base-20)",
    whiteSpace: "nowrap",
    userSelect: "none",
  };
  if (!sortable) return <th style={base}>{children}</th>;
  const arrow = active ? (dir === "asc" ? " \u2191" : " \u2193") : "";
  return (
    <th
      style={{ ...base, cursor: "pointer" }}
      onClick={onClick}
    >
      <span style={{ color: active ? "var(--color-text-normal)" : undefined }}>
        {children}
        {arrow}
      </span>
    </th>
  );
}

interface GroupBlockProps {
  type: AssetType;
  collapsed: boolean;
  total: number;
  baseCurrency: string;
  onToggle: () => void;
  rowCount: number;
  visibleRows: Row[];
  pricesLoading?: boolean;
}

function GroupBlock({
  type,
  collapsed,
  total,
  baseCurrency,
  onToggle,
  rowCount,
  visibleRows,
  pricesLoading,
}: GroupBlockProps) {
  const { t } = useTranslation();
  const badgeColor = TYPE_BADGE_COLORS[type] ?? "#6b7280";

  return (
    <>
      <tr>
        <td
          colSpan={9}
          style={{
            padding: "10px 8px 6px",
            borderTop: "1px solid var(--color-base-20)",
            background: "var(--color-base-15)",
            cursor: "pointer",
          }}
          onClick={onToggle}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-text-normal)",
            }}
          >
            <span style={{ fontSize: 10 }}>{collapsed ? "\u25B8" : "\u25BE"}</span>
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: badgeColor,
              }}
            />
            {t(`assetTypesPlural.${type}`)}
            <span
              style={{
                color: "var(--color-text-faint)",
                fontWeight: 400,
                marginLeft: 4,
              }}
            >
              ({rowCount})
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "var(--font-monospace)",
                color: "var(--color-text-muted)",
                fontWeight: 500,
              }}
            >
              {formatCurrency(total, baseCurrency)}
            </span>
          </span>
        </td>
      </tr>
      {!collapsed &&
        visibleRows.map((r) => (
          <HoldingsRow
            key={r.asset.id}
            row={r}
            baseCurrency={baseCurrency}
            pricesLoading={pricesLoading}
          />
        ))}
    </>
  );
}

function HoldingsRow({
  row,
  baseCurrency,
  pricesLoading,
}: {
  row: Row;
  baseCurrency: string;
  pricesLoading?: boolean;
}) {
  const { t } = useTranslation();
  const { asset, isManual, currentPrice, currentCurrency, marketValueBase } = row;

  const cellStyle: React.CSSProperties = {
    padding: "6px 8px",
    fontSize: 13,
    color: "var(--color-text-normal)",
    borderBottom: "1px solid var(--color-base-20)",
    fontFamily: "var(--font-monospace)",
    whiteSpace: "nowrap",
    lineHeight: 1.5,
  };
  const leftCell: React.CSSProperties = { ...cellStyle, textAlign: "left" };
  const rightCell: React.CSSProperties = { ...cellStyle, textAlign: "right" };

  const quantityCell =
    isManual && asset.quantity === 1 ? EM_DASH : fmtNum(asset.quantity, 4);
  const costCell =
    asset.costPrice != null
      ? formatCurrency(asset.costPrice, asset.costCurrency)
      : EM_DASH;

  // Price cell: skeleton bar when usePrices still fetching and this row
  // depends on a live quote that hasn't arrived yet.
  const waitingOnQuote =
    !!asset.ticker && currentPrice === null && !!pricesLoading;

  const priceCell =
    currentPrice === null || currentCurrency === null
      ? waitingOnQuote
        ? <Skeleton width={60} />
        : EM_DASH
      : formatCurrency(currentPrice, currentCurrency);

  const valueCell =
    currentPrice === null
      ? waitingOnQuote
        ? <Skeleton width={70} />
        : EM_DASH
      : formatCurrency(marketValueBase, baseCurrency);

  const pnlColor =
    row.pnlBase === null
      ? "var(--color-text-faint)"
      : row.pnlBase > 0
        ? "var(--color-gain)"
        : row.pnlBase < 0
          ? "var(--color-loss)"
          : "var(--color-text-normal)";
  const pnlCell =
    row.pnlBase === null
      ? EM_DASH
      : `${row.pnlBase > 0 ? "+" : ""}${formatCurrency(
          row.pnlBase,
          baseCurrency,
        )}`;

  const returnColor =
    row.returnPct === null
      ? "var(--color-text-faint)"
      : row.returnPct > 0
        ? "var(--color-gain)"
        : row.returnPct < 0
          ? "var(--color-loss)"
          : "var(--color-text-normal)";
  const returnCell =
    row.returnPct === null
      ? EM_DASH
      : `${row.returnPct > 0 ? "+" : ""}${(row.returnPct * 100).toFixed(2)}%`;

  return (
    <tr>
      <td style={leftCell}>
        <span
          style={{
            fontFamily: "var(--font-default, inherit)",
            color: "var(--color-text-normal)",
            fontWeight: 500,
          }}
        >
          {getAssetDisplayName(asset, t)}
        </span>
        <span
          style={{
            marginLeft: 8,
            padding: "1px 6px",
            fontSize: 10,
            fontFamily: "var(--font-monospace)",
            color: "var(--color-text-muted)",
            background: "var(--color-base-15)",
            border: "1px solid var(--color-base-20)",
            borderRadius: 3,
          }}
        >
          {t(`assetTypes.${asset.type}`)}
        </span>
      </td>
      <td style={leftCell}>
        <span style={{ color: asset.ticker ? "var(--color-text-normal)" : "var(--color-text-faint)" }}>
          {asset.ticker || EM_DASH}
        </span>
      </td>
      <td style={rightCell}>{quantityCell}</td>
      <td style={rightCell}>{costCell}</td>
      <td style={rightCell}>{priceCell}</td>
      <td style={rightCell}>{valueCell}</td>
      <td style={{ ...rightCell, color: pnlColor }}>{pnlCell}</td>
      <td style={{ ...rightCell, color: returnColor }}>{returnCell}</td>
      <td style={{ ...rightCell, color: "var(--color-text-faint)" }}>
        {/* PriceResult has no per-asset day change today — render em-dash
            instead of fabricating a value. */}
        {EM_DASH}
      </td>
    </tr>
  );
}

function Skeleton({ width }: { width: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width,
        height: 10,
        background: "var(--color-base-20)",
        borderRadius: 2,
        verticalAlign: "middle",
        opacity: 0.6,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EM_DASH = "\u2014";

function fmtNum(n: number, maxFrac = 4): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFrac,
  });
}

/**
 * Extract a comparable scalar for a row based on the active sort key.
 * Returning null means "missing" — those rows sort to the end regardless
 * of direction.
 */
function sortValue(r: Row, key: SortKey): number | null {
  switch (key) {
    case "value":
      return r.marketValueBase;
    case "returnPct":
      return r.returnPct;
    case "dayChange":
      // No per-asset day change yet — stable secondary sort by value.
      return r.marketValueBase;
  }
}
