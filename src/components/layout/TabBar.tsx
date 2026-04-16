import { Link, useLocation } from "react-router-dom";

const TABS = [
  { to: "/app", label: "Dashboard", emoji: "\u{1F4CA}" },
  { to: "/app/assets", label: "Assets", emoji: "\u{1F4BC}" },
  { to: "/app/history", label: "History", emoji: "\u{1F4C8}" },
] as const;

export default function TabBar() {
  const { pathname } = useLocation();

  return (
    <div
      style={{
        height: "var(--tab-height)",
        minHeight: "var(--tab-height)",
        background: "var(--color-base-10)",
        display: "flex",
        alignItems: "stretch",
        borderBottom: "1px solid var(--color-base-20)",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      {TABS.map(({ to, label, emoji }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "0 14px",
              fontSize: 12.5,
              fontWeight: active ? 500 : 400,
              color: active
                ? "var(--color-text-normal)"
                : "var(--color-text-muted)",
              background: active ? "var(--color-base-05)" : "transparent",
              borderBottom: active
                ? "2px solid var(--color-accent-kerdos)"
                : "2px solid transparent",
              textDecoration: "none",
              position: "relative",
              transition: "background 0.15s, color 0.15s",
              whiteSpace: "nowrap",
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
            <span style={{ fontSize: 13 }}>{emoji}</span>
            {label}
            {/* Decorative close button (Obsidian-like) */}
            <span
              style={{
                marginLeft: 6,
                fontSize: 11,
                color: "var(--color-text-faint)",
                opacity: 0.5,
                lineHeight: 1,
              }}
            >
              \u00D7
            </span>
          </Link>
        );
      })}
    </div>
  );
}
