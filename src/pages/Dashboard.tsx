import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNetWorth } from "@/hooks/useNetWorth";
import { useSnapshots } from "@/hooks/useSnapshots";
import { useAssets } from "@/hooks/useAssets";
import { usePrices } from "@/hooks/usePrices";
import { useReturns } from "@/hooks/useReturns";
import { useSettings } from "@/stores/settingsStore";
import NetWorthCard from "@/components/dashboard/NetWorthCard";
import DailyChangeCard from "@/components/dashboard/DailyChangeCard";
import NetWorthChart from "@/components/dashboard/NetWorthChart";
import AllocationPie from "@/components/dashboard/AllocationPie";
import ReturnsCard from "@/components/dashboard/ReturnsCard";
import HoldingsTable from "@/components/dashboard/HoldingsTable";
import CurrencyExposure from "@/components/dashboard/CurrencyExposure";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

// Breakpoint at which the dashboard collapses from a multi-column grid to
// a single stacked column. 900px aligns with the container sizes used by
// NetWorthCard / DailyChangeCard without crowding the ReturnsCard's three
// metrics.
const NARROW_BREAKPOINT = 900;

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < NARROW_BREAKPOINT;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setNarrow(window.innerWidth < NARROW_BREAKPOINT);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return narrow;
}

/**
 * Top-level wrapper. We check for the "truly empty" state (no assets in
 * IndexedDB, real or demo) BEFORE invoking any of the expensive dashboard
 * hooks. That way a fresh user hitting /app/ doesn't pay for useReturns /
 * usePrices / useSnapshots renders only to see them replaced by the
 * onboarding wizard.
 *
 * Splitting into an inner component is also what keeps the Rules of Hooks
 * happy: the inner component mounts only when we have at least one asset.
 */
export default function Dashboard() {
  const { assets, isLoading: assetsLoading } = useAssets();

  if (!assetsLoading && assets.length === 0) {
    return <OnboardingFlow />;
  }

  return <DashboardInner />;
}

function DashboardInner() {
  const { t } = useTranslation();
  const {
    totalNetWorth,
    dailyChange,
    dailyChangePercent,
    assetValues,
    isLoading,
  } = useNetWorth();

  // Chart-ready series includes intraday ticks so 1D/1W show a live curve.
  const { snapshots: chartSnapshots } = useSnapshots(365, {
    includeIntraday: true,
  });

  // Holdings table + currency exposure rely on the live asset list and
  // priced quotes. Pulling them once at this level keeps the two cards in
  // sync and avoids duplicate Dexie subscriptions.
  const { assets } = useAssets();
  const { prices, isLoading: pricesLoading } = usePrices(assets);

  const returns = useReturns();

  const { settings } = useSettings();
  const currency = settings.baseCurrency;

  const narrow = useIsNarrow();

  // NetWorthChart expects `{peakDate, troughDate, value}`; DrawdownResult
  // carries extra fields (recoveryDate, durationDays) that the chart
  // intentionally ignores. Pass the whole object — excess keys are fine.
  const drawdown = returns.maxDD
    ? {
        peakDate: returns.maxDD.peakDate,
        troughDate: returns.maxDD.troughDate,
        value: returns.maxDD.value,
      }
    : undefined;

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 256,
          color: "var(--color-text-muted)",
        }}
      >
        {t("dashboard.loading")}
      </div>
    );
  }

  const columns3 = narrow ? "1fr" : "1fr 1fr 1fr";
  const columns2 = narrow ? "1fr" : "1fr 1fr";

  return (
    <div
      style={{
        background: "var(--color-base-05)",
        minHeight: "100%",
        padding: 24,
      }}
    >
      {/* Row 1: headline cards — NetWorth / Daily Change / Returns */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: columns3,
          gap: 16,
          marginBottom: 16,
        }}
      >
        <NetWorthCard totalNetWorth={totalNetWorth} currency={currency} />
        <DailyChangeCard
          change={dailyChange}
          changePercent={dailyChangePercent}
          currency={currency}
        />
        <ReturnsCard
          twr={returns.twr}
          xirr={returns.xirr}
          maxDD={returns.maxDD}
          isLoading={returns.isLoading}
        />
      </div>

      {/* Row 2: full-width chart (benchmark compare + drawdown overlay) */}
      <div style={{ marginBottom: 16 }}>
        <NetWorthChart snapshots={chartSnapshots} drawdown={drawdown} />
      </div>

      {/* Row 3: Allocation by type + Currency exposure side by side */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: columns2,
          gap: 16,
          marginBottom: 16,
        }}
      >
        <AllocationPie assets={assetValues} />
        <CurrencyExposure
          assets={assets}
          prices={prices}
          baseCurrency={currency}
        />
      </div>

      {/* Row 4: full-width holdings detail table */}
      <div>
        <HoldingsTable
          assets={assets}
          prices={prices}
          baseCurrency={currency}
          pricesLoading={pricesLoading}
        />
      </div>
    </div>
  );
}
