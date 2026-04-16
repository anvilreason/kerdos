import { Link } from "react-router-dom";

interface TopBarProps {
  onRefresh?: () => void;
  onAddAsset?: () => void;
  onToggleSidebar?: () => void;
}

export default function TopBar({
  onRefresh,
  onAddAsset,
  onToggleSidebar,
}: TopBarProps) {
  const iconBtnStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    border: "none",
    borderRadius: 4,
    background: "transparent",
    color: "var(--color-text-muted)",
    fontSize: 14,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s, color 0.15s",
  };

  const handleHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLElement).style.background = "var(--color-base-15)";
    (e.currentTarget as HTMLElement).style.color = "var(--color-text-normal)";
  };
  const handleLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLElement).style.background = "transparent";
    (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
  };

  return (
    <header
      style={{
        height: "var(--topbar-height)",
        minHeight: "var(--topbar-height)",
        background: "var(--color-base-00)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 10px",
        borderBottom: "1px solid var(--color-base-20)",
        userSelect: "none",
        WebkitAppRegion: "drag",
      } as React.CSSProperties}
    >
      {/* Left: traffic lights + nav + hamburger */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Decorative traffic light dots */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginRight: 8,
            WebkitAppRegion: "no-drag",
          } as React.CSSProperties}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#ff5f57",
              display: "inline-block",
            }}
          />
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#febc2e",
              display: "inline-block",
            }}
          />
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#28c840",
              display: "inline-block",
            }}
          />
        </div>

        {/* Back / Forward */}
        <button
          style={iconBtnStyle}
          onClick={() => window.history.back()}
          onMouseEnter={handleHover}
          onMouseLeave={handleLeave}
          title="Back"
        >
          ←
        </button>
        <button
          style={iconBtnStyle}
          onClick={() => window.history.forward()}
          onMouseEnter={handleHover}
          onMouseLeave={handleLeave}
          title="Forward"
        >
          →
        </button>

        {/* Hamburger for mobile */}
        <button
          style={{
            ...iconBtnStyle,
            display: "none", // hidden on desktop; use CSS media query for mobile
          }}
          onClick={onToggleSidebar}
          onMouseEnter={handleHover}
          onMouseLeave={handleLeave}
          title="Menu"
        >
          ☰
        </button>
      </div>

      {/* Center: Add Asset */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          WebkitAppRegion: "no-drag",
        } as React.CSSProperties}
      >
        <button
          onClick={onAddAsset}
          style={{
            ...iconBtnStyle,
            fontSize: 16,
            color: "var(--color-text-accent)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "var(--color-accent-subtle)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
          title="Add Asset"
        >
          ⊕
        </button>
      </div>

      {/* Right: Refresh + Settings */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          WebkitAppRegion: "no-drag",
        } as React.CSSProperties}
      >
        <button
          onClick={onRefresh}
          style={iconBtnStyle}
          onMouseEnter={handleHover}
          onMouseLeave={handleLeave}
          title="Refresh prices"
        >
          ⟳
        </button>
        <Link
          to="/app/settings"
          style={{
            ...iconBtnStyle,
            textDecoration: "none",
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
          title="Settings"
        >
          ⚙️
        </Link>
      </div>
    </header>
  );
}
