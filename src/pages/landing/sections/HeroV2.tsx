/**
 * HeroV2 — Notion-style Landing hero (T-W4-03).
 *
 * Differences from the original Hero.tsx (kept untouched so W4-02 can
 * land a "Download" button there without merge conflicts):
 *   · Sharper headline focused on "recalculated every minute"
 *   · Three CTAs: Try Demo (primary), Start Fresh, Download
 *   · Live mini-dashboard below the fold, driven by buildDemoPortfolio
 *     so the numbers are deterministic but tick forward every 5s.
 *
 * The mini-dashboard intentionally does NOT reuse DemoWindow — that
 * component is a full 3-panel IDE-style view. For the hero we want a
 * quieter, Notion-ish card.
 */
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInView } from "@/utils/animations";
import { buildDemoPortfolio } from "@/data/demo-portfolio";
import { convertCurrency } from "@/utils/currency";
import { useSettings } from "@/stores/settingsStore";
import type { Snapshot } from "@/types/snapshot";
import type { Asset } from "@/types/asset";

// ---------------------------------------------------------------------------
// Mini live dashboard
// ---------------------------------------------------------------------------

interface MiniRow {
  assetId: string;
  name: string;
  ticker: string;
  value: number;
  change: number;
}

function computeDayChange(snapshots: Snapshot[]): {
  total: number;
  change: number;
  pct: number;
} {
  if (snapshots.length === 0) return { total: 0, change: 0, pct: 0 };
  const last = snapshots[snapshots.length - 1];
  const prev = snapshots.length > 1 ? snapshots[snapshots.length - 2] : last;
  const total = last.totalNetWorth;
  const change = last.totalNetWorth - prev.totalNetWorth;
  const pct = prev.totalNetWorth === 0 ? 0 : (change / prev.totalNetWorth) * 100;
  return { total, change, pct };
}

/**
 * Convert a USD-denominated amount to the user's base currency and
 * format it using the standard Intl currency formatter. This is what
 * makes the hero card honour the Region picker in Navbar.
 *
 * `locale` decides grouping/decimal marks; we align it to the active
 * i18n language so Chinese users see a 中文-style grouping.
 */
function formatMoney(
  usdAmount: number,
  targetCurrency: string,
  locale: string,
  digits = 0,
): string {
  const converted = convertCurrency(usdAmount, "USD", targetCurrency);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: targetCurrency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(converted);
  } catch {
    return `${targetCurrency} ${converted.toFixed(digits)}`;
  }
}

/**
 * Build a sparkline polyline string for the last N snapshots.
 * viewBox is 0..400 x 0..80.
 */
function sparklinePoints(values: number[]): string {
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = 400 / Math.max(values.length - 1, 1);
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = 72 - ((v - min) / range) * 64;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function MiniDashboard() {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const currency = settings.baseCurrency;
  const locale = i18n.language || "en";

  // One-shot build. 90 daily snapshots is overkill for a sparkline, but
  // the data is tiny so we keep it simple.
  const { assets, snapshots } = useMemo(() => buildDemoPortfolio(90), []);

  // Tick index: 0..snapshots.length-1, advanced every 5s. We don't
  // mutate data — we just move the "pointer" forward so the numbers
  // appear to update in real time.
  const [tick, setTick] = useState(() => Math.max(snapshots.length - 1, 0));

  useEffect(() => {
    if (snapshots.length <= 1) return;
    const id = setInterval(() => {
      setTick((t) => {
        // Oscillate between ~half-way and the end so the line always
        // looks like it's "moving" on the visible portion of the chart.
        const end = snapshots.length - 1;
        const start = Math.max(end - 30, 0);
        if (t >= end) return start;
        return t + 1;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [snapshots.length]);

  const visibleSnapshots = snapshots.slice(0, tick + 1);
  const { total, change, pct } = computeDayChange(visibleSnapshots);
  const isGain = change >= 0;

  // Show 3 top rows by value at the current tick.
  const rows: MiniRow[] = useMemo(() => {
    if (visibleSnapshots.length === 0) return [];
    const latest = visibleSnapshots[visibleSnapshots.length - 1];
    const prev =
      visibleSnapshots.length > 1
        ? visibleSnapshots[visibleSnapshots.length - 2]
        : latest;
    const byAsset = new Map<string, Asset>();
    for (const a of assets) byAsset.set(a.id, a);

    return latest.breakdown
      .map((b): MiniRow => {
        const prevValue =
          prev.breakdown.find((x) => x.assetId === b.assetId)?.value ??
          b.value;
        const delta = prevValue === 0 ? 0 : ((b.value - prevValue) / prevValue) * 100;
        const a = byAsset.get(b.assetId);
        return {
          assetId: b.assetId,
          name: a?.name ?? b.assetId,
          ticker: a?.ticker ?? "",
          value: b.value,
          change: delta,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  // Intentionally depend on `tick` so rows recompute; assets is stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, assets]);

  const sparkSeries = visibleSnapshots.map((s) => s.totalNetWorth);
  const polyline = sparklinePoints(sparkSeries);
  const firstPoint = polyline ? polyline.split(" ")[0] : "0,72";
  const lastPoint = polyline
    ? polyline.split(" ")[polyline.split(" ").length - 1]
    : "400,72";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 560,
        margin: "0 auto",
      }}
    >
      {/* Soft glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "110%",
          height: "110%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(201, 151, 42, 0.14) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          background: "#1a1b1e",
          border: "1px solid var(--kerdos-border)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        {/* Window frame */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 14px",
            borderBottom: "1px solid var(--kerdos-border)",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#ff5f57",
            }}
          />
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#febc2e",
            }}
          />
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#28c840",
            }}
          />
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: "var(--kerdos-text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#22c55e",
                animation: "kerdos-pulse 2s ease-in-out infinite",
              }}
            />
            {t("landing.hero.miniDash.live", "Live")}
          </span>
        </div>

        <div style={{ padding: "22px 26px 20px" }}>
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--kerdos-text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            {t("landing.hero.miniDash.totalNetWorth", "Total Net Worth")}
          </p>
          <p
            style={{
              margin: "0 0 6px",
              fontSize: 34,
              fontWeight: 700,
              color: "var(--kerdos-text-primary)",
              fontFamily: "var(--font-monospace)",
              letterSpacing: "-0.02em",
            }}
          >
            {formatMoney(total, currency, locale)}
          </p>
          <p
            style={{
              margin: "0 0 18px",
              fontSize: 13,
              fontWeight: 600,
              color: isGain ? "var(--color-gain)" : "var(--color-loss)",
              fontFamily: "var(--font-monospace)",
            }}
          >
            {isGain ? "+" : ""}
            {formatMoney(change, currency, locale, 2)} ({isGain ? "+" : ""}
            {pct.toFixed(2)}%)
          </p>

          {/* Sparkline */}
          <svg
            viewBox="0 0 400 80"
            style={{ width: "100%", height: "auto", marginBottom: 14 }}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="heroV2Grad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--kerdos-accent)"
                  stopOpacity="0.28"
                />
                <stop
                  offset="100%"
                  stopColor="var(--kerdos-accent)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>
            {polyline && (
              <>
                <polygon
                  points={`${firstPoint.split(",")[0]},80 ${polyline} ${lastPoint.split(",")[0]},80`}
                  fill="url(#heroV2Grad)"
                />
                <polyline
                  points={polyline}
                  fill="none"
                  stroke="var(--kerdos-accent)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}
          </svg>

          {/* Top rows */}
          {rows.map((row) => (
            <div
              key={row.assetId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderTop: "1px solid var(--kerdos-border)",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--kerdos-text-primary)",
                }}
              >
                {row.ticker || row.name}
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    fontWeight: 400,
                    color: "var(--kerdos-text-secondary)",
                  }}
                >
                  {row.ticker ? row.name : ""}
                </span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--kerdos-text-primary)",
                    fontFamily: "var(--font-monospace)",
                  }}
                >
                  {formatMoney(row.value, currency, locale)}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color:
                      row.change >= 0
                        ? "var(--color-gain)"
                        : "var(--color-loss)",
                    fontFamily: "var(--font-monospace)",
                    minWidth: 48,
                    textAlign: "right",
                  }}
                >
                  {row.change >= 0 ? "+" : ""}
                  {row.change.toFixed(2)}%
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes kerdos-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HeroV2
// ---------------------------------------------------------------------------

export default function HeroV2() {
  const { t } = useTranslation();
  const { ref, inView } = useInView(0.05);

  const primaryCtaStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "14px 28px",
    borderRadius: 8,
    background: "#c9972a",
    color: "#0a0d12",
    fontSize: 15,
    fontWeight: 600,
    textDecoration: "none",
    transition: "background 0.2s, transform 0.2s",
  };

  const secondaryCtaStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "14px 24px",
    borderRadius: 8,
    background: "transparent",
    color: "var(--kerdos-text-primary)",
    fontSize: 15,
    fontWeight: 500,
    textDecoration: "none",
    border: "1px solid var(--kerdos-border, #303033)",
    transition: "background 0.2s, border-color 0.2s",
  };

  return (
    <section
      id="hero"
      ref={ref}
      style={{
        padding: "168px 24px 72px",
        background: "var(--kerdos-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      <div style={{ maxWidth: 960, width: "100%" }}>
        <h1
          style={{
            fontSize: "clamp(2.5rem, 5.5vw, 4.25rem)",
            fontWeight: 800,
            lineHeight: 1.05,
            color: "var(--kerdos-text-primary)",
            margin: "0 0 22px",
            letterSpacing: "-0.03em",
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          {t("landing.hero.title", "Your wealth, recalculated every minute.")}
        </h1>

        <p
          style={{
            fontSize: "clamp(1rem, 1.8vw, 1.15rem)",
            fontWeight: 400,
            color: "var(--kerdos-text-secondary)",
            maxWidth: 680,
            margin: "0 auto 36px",
            lineHeight: 1.65,
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease 0.08s, transform 0.6s ease 0.08s",
          }}
        >
          {t(
            "landing.hero.subtitle",
            "The free, local-first tracker. Stocks, crypto, cash, and more \u2014 all computed live on your device. No signup. No cloud. No tracking.",
          )}
        </p>

        {/* CTA row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            flexWrap: "wrap",
            marginBottom: 56,
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.6s ease 0.16s, transform 0.6s ease 0.16s",
          }}
        >
          <a
            href="#/demo"
            style={primaryCtaStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e0ab35";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#c9972a";
            }}
          >
            {t("landing.hero.ctaTryDemo", "Try Demo")}
            <span aria-hidden="true" style={{ fontSize: 13 }}>
              {"\u2192"}
            </span>
          </a>
          <a
            href="#/app/"
            style={secondaryCtaStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.borderColor = "#888891";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor =
                "var(--kerdos-border, #303033)";
            }}
          >
            {t("landing.hero.ctaStartFresh", "Start Fresh")}
          </a>
          <a
            href="#download"
            style={secondaryCtaStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.borderColor = "#888891";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor =
                "var(--kerdos-border, #303033)";
            }}
          >
            {t(
              "landing.hero.ctaDownload",
              "Download for Mac / Windows / Linux",
            )}
          </a>
        </div>

        {/* Live mini dashboard */}
        <div
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.7s ease 0.24s, transform 0.7s ease 0.24s",
          }}
        >
          <MiniDashboard />
        </div>

        <p
          style={{
            marginTop: 20,
            fontSize: 13,
            fontStyle: "italic",
            color: "var(--kerdos-text-secondary)",
          }}
        >
          {t(
            "landing.hero.caption",
            "Real demo data. Runs fully offline. Your device, your numbers.",
          )}
        </p>
      </div>
    </section>
  );
}
