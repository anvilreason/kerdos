/**
 * AssetTypeCard — a single "pick-your-first-asset-type" tile.
 *
 * Rendered in a 3-column grid inside Step 1 of the Onboarding flow.
 * Intentionally dumb: the parent owns selection state and navigation.
 */
import { useState, type ReactNode } from "react";

interface AssetTypeCardProps {
  /** Stable identifier — parent maps it back to an AssetType. */
  type: string;
  /** Lucide icon element rendered at ~22px. */
  icon: ReactNode;
  /** Human-readable localized label. */
  label: string;
  /** Optional one-line helper ("e.g. AAPL, NVDA" etc). */
  hint?: string;
  /** Invoked when the user clicks or keyboard-activates the card. */
  onClick: () => void;
}

export default function AssetTypeCard({
  type,
  icon,
  label,
  hint,
  onClick,
}: AssetTypeCardProps) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setActive(false);
      }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      data-asset-type={type}
      aria-label={label}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 10,
        padding: "16px 14px",
        minHeight: 104,
        textAlign: "left",
        borderRadius: 10,
        border: `1px solid ${
          hover
            ? "var(--kerdos-accent, #c9972a)"
            : "var(--color-base-20, #2a2d35)"
        }`,
        background: active
          ? "rgba(201,151,42,0.12)"
          : hover
            ? "var(--color-base-05, #1a1d23)"
            : "var(--color-base-00, #0d0d0d)",
        color: "var(--color-text-normal, #dcddde)",
        cursor: "pointer",
        transition: "all 0.15s ease",
        boxShadow: hover
          ? "0 2px 8px rgba(0, 0, 0, 0.24)"
          : "none",
        transform: active ? "translateY(1px)" : "translateY(0)",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: hover
            ? "rgba(201,151,42,0.18)"
            : "var(--color-base-10, #1e2128)",
          color: hover
            ? "var(--kerdos-accent, #c9972a)"
            : "var(--color-text-muted, #9ca3af)",
          transition: "all 0.15s ease",
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--color-text-normal, #dcddde)",
          lineHeight: 1.2,
        }}
      >
        {label}
      </span>
      {hint && (
        <span
          style={{
            fontSize: 11,
            color: "var(--color-text-faint, #6b7280)",
            lineHeight: 1.3,
          }}
        >
          {hint}
        </span>
      )}
    </button>
  );
}
