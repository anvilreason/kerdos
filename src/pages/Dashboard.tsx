import { useTranslation } from "react-i18next";
import { useNetWorth } from "@/hooks/useNetWorth";
import { useSnapshots } from "@/hooks/useSnapshots";
import { useSettings } from "@/stores/settingsStore";
import NetWorthCard from "@/components/dashboard/NetWorthCard";
import DailyChangeCard from "@/components/dashboard/DailyChangeCard";
import NetWorthChart from "@/components/dashboard/NetWorthChart";
import AllocationPie from "@/components/dashboard/AllocationPie";
import TopMovers from "@/components/dashboard/TopMovers";

export default function Dashboard() {
  const { t } = useTranslation();
  const {
    totalNetWorth,
    dailyChange,
    dailyChangePercent,
    assetValues,
    isLoading,
  } = useNetWorth();

  const { snapshots } = useSnapshots(365);
  const { settings } = useSettings();
  const currency = settings.baseCurrency;

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

  return (
    <div style={{ background: "var(--color-base-05)", minHeight: "100%", padding: 24 }}>
      {/* Top row: Net Worth + Daily Change */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <NetWorthCard totalNetWorth={totalNetWorth} currency={currency} />
        <DailyChangeCard
          change={dailyChange}
          changePercent={dailyChangePercent}
          currency={currency}
        />
      </div>

      {/* Middle row: Chart full width */}
      <div style={{ marginBottom: 24 }}>
        <NetWorthChart snapshots={snapshots} />
      </div>

      {/* Bottom row: Allocation + Top Movers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <AllocationPie assets={assetValues} />
        <TopMovers
          snapshots={snapshots}
          assetValues={assetValues}
          currency={currency}
        />
      </div>
    </div>
  );
}
