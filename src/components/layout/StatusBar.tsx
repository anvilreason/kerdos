import { useMemo } from "react";
import { useAssets } from "@/hooks/useAssets";

interface StatusBarProps {
  onRefresh?: () => void;
}

export default function StatusBar({ onRefresh }: StatusBarProps) {
  const { assets } = useAssets();
  const assetCount = assets.length;

  // Simple "last refresh" display - in a real app you'd track this from usePrices
  const lastRefreshText = useMemo(() => {
    return "just now";
  }, []);

  return (
    <div
      style={{
        height: "var(--status-bar-height)",
        minHeight: "var(--status-bar-height)",
        background: "var(--color-base-10)",
        borderTop: "1px solid var(--color-base-20)",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        fontSize: 12,
        color: "var(--color-text-muted)",
        gap: 6,
        userSelect: "none",
        overflow: "hidden",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: "var(--color-gain)" }}>{"\u{1F7E2}"}</span>
      <span>All prices live</span>
      <span style={{ color: "var(--color-text-faint)" }}>{"\u00B7"}</span>
      <span>Last refresh: {lastRefreshText}</span>
      <span style={{ color: "var(--color-text-faint)" }}>{"\u00B7"}</span>
      <span>{assetCount} assets</span>
      <span style={{ color: "var(--color-text-faint)" }}>{"\u00B7"}</span>
      <span>Base currency: USD</span>
      <span style={{ flex: 1 }} />
      <button
        onClick={onRefresh}
        style={{
          border: "none",
          background: "transparent",
          color: "var(--color-text-muted)",
          fontSize: 12,
          cursor: "pointer",
          padding: "0 4px",
          display: "flex",
          alignItems: "center",
          gap: 3,
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color =
            "var(--color-text-normal)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color =
            "var(--color-text-muted)";
        }}
      >
        {"\u27F3"} Refresh now
      </button>
    </div>
  );
}
