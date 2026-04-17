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
 * Format a Date into `intra-YYYYMMDDTHHmm` — used as the intraday
 * snapshot primary key so repeated calls within the same minute
 * get de-duplicated via Dexie's `put` (same id overwrites).
 */
function intradayId(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `intra-${y}${mo}${da}T${hh}${mm}`;
}

/**
 * Compute the current breakdown + net worth from live assets and prices.
 * Extracted so both daily and intraday snapshot writers share the same
 * valuation logic.
 */
async function computeCurrentValuation(): Promise<{
  breakdown: SnapshotBreakdown[];
  totalNetWorth: number;
  baseCurrency: string;
} | null> {
  const assets = await db.assets.toArray();
  if (assets.length === 0) return null;

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

  return { breakdown, totalNetWorth, baseCurrency };
}

/**
 * Check if today's daily snapshot exists; if not, create one.
 * Only matches non-intraday rows (intraday snapshots share the same
 * `date` field, so we must filter them out).
 */
export async function checkAndCreateSnapshot(): Promise<void> {
  const date = todayStr();
  const existing = await db.snapshots
    .where("date")
    .equals(date)
    .filter((s) => !s.intraday)
    .first();
  if (existing) return;

  await createSnapshot();
}

/**
 * Create a daily snapshot with current asset values (intraday:false).
 */
export async function createSnapshot(): Promise<void> {
  const v = await computeCurrentValuation();
  if (!v) return;

  const date = todayStr();
  const snapshot: Snapshot = {
    id: crypto.randomUUID(),
    date,
    totalNetWorth: v.totalNetWorth,
    currency: v.baseCurrency,
    breakdown: v.breakdown,
    createdAt: new Date(),
    intraday: false,
  };

  await db.snapshots.put(snapshot);
}

/**
 * Create an intraday snapshot (intraday:true). Called by the usePrices
 * tick during market hours (via App.tsx).
 *
 *  - Writes a new snapshot row per tick (does not coalesce across
 *    minutes); same-minute duplicate calls are deduped by `id` via `put`.
 *  - `id` = `intra-YYYYMMDDTHHmm` (local wall-clock). No UUID.
 *  - `date` stays `YYYY-MM-DD` (consistent with daily snapshots so the
 *    `date` index keeps working for range queries).
 *  - Daily snapshot (if any) for the same date uses a UUID id, so the
 *    two kinds never collide at the primary-key level.
 */
export async function createIntradaySnapshot(): Promise<void> {
  const v = await computeCurrentValuation();
  if (!v) return;

  const now = new Date();
  const snapshot: Snapshot = {
    id: intradayId(now),
    date: todayStr(),
    totalNetWorth: v.totalNetWorth,
    currency: v.baseCurrency,
    breakdown: v.breakdown,
    createdAt: now,
    intraday: true,
  };

  await db.snapshots.put(snapshot);
}

/**
 * Retention: prune intraday snapshots older than `days` (default 90).
 *
 *  - Only deletes rows with `intraday === true`. Daily snapshots
 *    (intraday=false/undefined) are never pruned here.
 *  - The v1→v2 upgrade backfilled `intraday=false` on legacy rows, so
 *    a strict `s.intraday === true` check cannot hit pre-v2 data.
 *  - Returns the number of pruned rows.
 *
 * Implementation note: IndexedDB's treatment of `boolean` values is
 * inconsistent across browsers (some store them as 0/1, some refuse to
 * index them at all). Rather than rely on the `intraday` index for the
 * equality test, we do a linear scan filtered by both conditions. On a
 * 90-day horizon of 15-min snapshots (~2160 rows/day open market × 90d
 * ≈ ~25k rows max) this is still a millisecond-level operation.
 */
export async function pruneOldIntradaySnapshots(
  days = 90,
): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const y = cutoff.getFullYear();
  const m = String(cutoff.getMonth() + 1).padStart(2, "0");
  const d = String(cutoff.getDate()).padStart(2, "0");
  const cutoffStr = `${y}-${m}-${d}`;

  const keys = await db.snapshots
    .where("date")
    .below(cutoffStr)
    .filter((s) => s.intraday === true)
    .primaryKeys();

  if (keys.length === 0) return 0;
  await db.snapshots.bulkDelete(keys);
  return keys.length;
}
