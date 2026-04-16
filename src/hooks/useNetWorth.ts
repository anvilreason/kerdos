import { useMemo } from "react";
import { useAssets } from "@/hooks/useAssets";
import { usePrices } from "@/hooks/usePrices";
import { useSnapshots } from "@/hooks/useSnapshots";
import type { AssetType } from "@/types/asset";

export interface AssetValue {
  assetId: string;
  name: string;
  type: AssetType;
  value: number;
}

export interface NetWorthResult {
  totalNetWorth: number;
  dailyChange: number;
  dailyChangePercent: number;
  assetValues: AssetValue[];
  isLoading: boolean;
  refetch: () => void;
}

export function useNetWorth(): NetWorthResult {
  const { assets, isLoading: assetsLoading } = useAssets();
  const { prices, isLoading: pricesLoading, refetch } = usePrices(assets);
  const { snapshots, isLoading: snapshotsLoading } = useSnapshots(7);

  const assetValues = useMemo<AssetValue[]>(() => {
    return assets.map((asset) => {
      let unitPrice = 0;

      if (asset.ticker) {
        const priceResult = prices.get(asset.ticker);
        if (priceResult) {
          unitPrice = priceResult.price;
        }
      }

      // Fall back to manualPrice if no ticker or no fetched price
      if (unitPrice === 0 && asset.manualPrice != null) {
        unitPrice = asset.manualPrice;
      }

      return {
        assetId: asset.id,
        name: asset.name,
        type: asset.type,
        value: unitPrice * asset.quantity,
      };
    });
  }, [assets, prices]);

  const totalNetWorth = useMemo(
    () => assetValues.reduce((sum, av) => sum + av.value, 0),
    [assetValues],
  );

  const { dailyChange, dailyChangePercent } = useMemo(() => {
    if (snapshots.length === 0) {
      return { dailyChange: 0, dailyChangePercent: 0 };
    }

    // Find yesterday's snapshot (the most recent one before today)
    const today = new Date().toISOString().slice(0, 10);
    const yesterdaySnapshot = [...snapshots]
      .reverse()
      .find((s) => s.date < today);

    if (!yesterdaySnapshot) {
      return { dailyChange: 0, dailyChangePercent: 0 };
    }

    const change = totalNetWorth - yesterdaySnapshot.totalNetWorth;
    const percent =
      yesterdaySnapshot.totalNetWorth !== 0
        ? (change / yesterdaySnapshot.totalNetWorth) * 100
        : 0;

    return { dailyChange: change, dailyChangePercent: percent };
  }, [totalNetWorth, snapshots]);

  return {
    totalNetWorth,
    dailyChange,
    dailyChangePercent,
    assetValues,
    isLoading: assetsLoading || pricesLoading || snapshotsLoading,
    refetch,
  };
}
