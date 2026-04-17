import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TWRResult, XIRRResult } from "@/utils/returns";
import type { DrawdownResult } from "@/utils/drawdown";

interface ReturnsCardProps {
  twr: TWRResult | null;
  xirr: XIRRResult | null;
  maxDD: DrawdownResult | null;
  isLoading?: boolean;
}

/**
 * Dashboard tile rendering three headline performance numbers:
 *   · TWR (annualised) — investing skill, independent of cash-flow timing
 *   · XIRR            — dollar-weighted annualised return
 *   · Max Drawdown    — worst peak-to-trough drop
 *
 * Layout: one card, three sub-blocks side by side (stacks vertically when
 * the container shrinks, via a fallback flex wrap). Each sub-block has a
 * label + number + a question-mark "?" icon that opens a plain-language
 * tooltip on hover or focus.
 *
 * Styling matches NetWorthCard / DailyChangeCard exactly: --color-base-10
 * background, 1px --color-base-20 border, monospace value font.
 */
export default function ReturnsCard({
  twr,
  xirr,
  maxDD,
  isLoading,
}: ReturnsCardProps) {
  const { t } = useTranslation();

  const cardStyle: React.CSSProperties = {
    background: "var(--color-base-10)",
    border: "1px solid var(--color-base-20)",
    borderRadius: 8,
    padding: "20px 24px",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 13,
    color: "var(--color-text-muted)",
    fontWeight: 500,
    marginBottom: 16,
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 24,
  };

  if (isLoading) {
    return (
      <div style={cardStyle}>
        <div style={titleStyle}>{t("dashboard.returns.title")}</div>
        <div
          style={{
            color: "var(--color-text-faint)",
            fontSize: 13,
            padding: "16px 0",
          }}
        >
          {t("dashboard.loading")}
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>{t("dashboard.returns.title")}</div>
      <div style={rowStyle}>
        <Metric
          label={t("dashboard.returns.twr.label")}
          help={t("dashboard.returns.twr.help")}
          render={() =>
            twr
              ? {
                  text: formatPercent(twr.annualized),
                  color: pickColor(twr.annualized),
                  sub:
                    twr.periodDays > 0
                      ? t("dashboard.returns.annualized", {
                          days: twr.periodDays,
                        })
                      : undefined,
                }
              : null
          }
        />
        <Metric
          label={t("dashboard.returns.xirr.label")}
          help={t("dashboard.returns.xirr.help")}
          render={() =>
            xirr && xirr.rate !== null
              ? {
                  text: formatPercent(xirr.rate),
                  color: pickColor(xirr.rate),
                }
              : null
          }
        />
        <Metric
          label={t("dashboard.returns.maxDD.label")}
          help={t("dashboard.returns.maxDD.help")}
          render={() =>
            maxDD
              ? {
                  text: formatPercent(maxDD.value),
                  color: pickColor(maxDD.value),
                  sub: `${maxDD.peakDate} \u2192 ${maxDD.troughDate}${
                    maxDD.durationDays > 0
                      ? ` (${t("dashboard.returns.maxDD.durationDays", {
                          days: maxDD.durationDays,
                        })})`
                      : ""
                  }${
                    maxDD.recoveryDate
                      ? ` \u00B7 ${t(
                          "dashboard.returns.maxDD.recoveredOn",
                          { date: maxDD.recoveryDate },
                        )}`
                      : ` \u00B7 ${t("dashboard.returns.maxDD.notRecovered")}`
                  }`,
                }
              : null
          }
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface MetricRender {
  text: string;
  color: string;
  /** Optional small line shown under the main value. */
  sub?: string;
}

interface MetricProps {
  label: string;
  help: string;
  /** Returning null renders an em-dash placeholder. */
  render: () => MetricRender | null;
}

function Metric({ label, help, render }: MetricProps) {
  const rendered = render();

  const blockStyle: React.CSSProperties = {
    flex: "1 1 120px",
    minWidth: 120,
  };

  const labelRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "var(--color-text-muted)",
    fontWeight: 500,
  };

  const valueStyle: React.CSSProperties = {
    fontFamily: "var(--font-monospace)",
    fontSize: 22,
    fontWeight: 600,
    color: rendered ? rendered.color : "var(--color-text-faint)",
    lineHeight: 1.2,
  };

  const subStyle: React.CSSProperties = {
    fontSize: 11,
    color: "var(--color-text-faint)",
    marginTop: 4,
    fontFamily: "var(--font-monospace)",
  };

  return (
    <div style={blockStyle}>
      <div style={labelRowStyle}>
        <span style={labelStyle}>{label}</span>
        <HelpIcon text={help} />
      </div>
      <div style={valueStyle}>{rendered ? rendered.text : "\u2014"}</div>
      {rendered?.sub && <div style={subStyle}>{rendered.sub}</div>}
    </div>
  );
}

/**
 * Small (?) button that reveals a tooltip on hover or keyboard focus.
 * The tooltip is absolutely positioned over the sub-block, so we set
 * position: relative on the wrapping <span>.
 */
function HelpIcon({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  const btnStyle: React.CSSProperties = {
    width: 14,
    height: 14,
    borderRadius: "50%",
    border: "1px solid var(--color-base-25)",
    background: "transparent",
    color: "var(--color-text-faint)",
    fontSize: 10,
    lineHeight: 1,
    padding: 0,
    cursor: "help",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const tooltipStyle: React.CSSProperties = {
    position: "absolute",
    top: "100%",
    left: 0,
    marginTop: 6,
    padding: "8px 10px",
    fontSize: 11,
    lineHeight: 1.4,
    color: "var(--color-text-normal)",
    background: "var(--color-base-00)",
    border: "1px solid var(--color-base-20)",
    borderRadius: 6,
    maxWidth: 240,
    zIndex: 10,
    whiteSpace: "normal",
    pointerEvents: "none",
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
  };

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        style={btnStyle}
        aria-label="Help"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      {open && <span style={tooltipStyle}>{text}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatPercent(frac: number): string {
  const pct = frac * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function pickColor(frac: number): string {
  if (frac > 0) return "var(--color-gain)";
  if (frac < 0) return "var(--color-loss)";
  return "var(--color-text-normal)";
}
