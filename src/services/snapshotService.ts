import { db } from "@/db";
import { getPrices } from "@/services/priceService";
import { convertCurrency } from "@/utils/currency";
import type { SnapshotBreakdown, Snapshot } from "@/types/snapshot";

const MANUAL_TYPES = new Set(["real_estate", "vehicle", "cash", "other"]);

/**
 * Get today's date as "YYYY-MM-DD".
 */
function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Check if today's snapshot exists; if not, create one.
 */
export async function checkAndCreateSnapshot(): Promise<void> {
  const date = todayStr();
  const existing = await db.snapshots.where("date").equals(date).first();
  if (existing) return;

  await createSnapshot();
}

/**
 * Create a snapshot with current asset values.
 */
export async function createSnapshot(): Promise<void> {
  const assets = await db.assets.toArray();
  if (assets.length === 0) return;

  // Read base currency from settings
  const baseCurrencyRow = await db.settings.get("baseCurrency");
  const baseCurrency =
    baseCurrencyRow && typeof baseCurrencyRow.value === "string"
      ? baseCurrencyRow.value
      : "USD";

  // Fetch prices for ticker-based assets
  const priceMap = await getPrices(
    assets
      .filter((a) => !!a.ticker)
      .map((a) => ({ type: a.type, ticker: a.ticker! })),
  );

  const breakdown: SnapshotBreakdown[] = [];
  let totalNetWorth = 0;

  for (const asset of assets) {
    const isManual = MANUAL_TYPES.has(asset.type);
    let unitPrice = 0;
    let priceCurrency = baseCurrency;

    if (isManual && asset.manualPrice != null) {
      unitPrice = asset.manualPrice;
      priceCurrency = asset.costCurrency;
    } else if (asset.ticker && priceMap.has(asset.ticker)) {
      const pr = priceMap.get(asset.ticker)!;
      unitPrice = pr.price;
      priceCurrency = pr.currency;
    }

    const rawValue = unitPrice * asset.quantity;
    const value = convertCurrency(rawValue, priceCurrency, baseCurrency);

    breakdown.push({
      assetId: asset.id,
      value,
      price: unitPrice,
    });

    totalNetWorth += value;
  }

  const date = todayStr();
  const snapshot: Snapshot = {
    id: crypto.randomUUID(),
    date,
    totalNetWorth,
    currency: baseCurrency,
    breakdown,
    createdAt: new Date(),
  };

  await db.snapshots.put(snapshot);
}
