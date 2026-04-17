import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import { db } from "@/db";

/** Allowed polling intervals (seconds). */
export type PollIntervalSec = 30 | 60 | 300;

/** Allowed intraday-snapshot cadence (minutes). */
export type SnapshotIntervalMin = 5 | 15 | 30 | 60;

export interface Settings {
  baseCurrency: string;
  refreshInterval: number;
  theme: string;
  snapshotTime: string;

  // --- T-W2-03: market-aware polling (added v2.0) ---
  // Poll cadence when at least one relevant market is open. Capped to a
  // 5-minute discrete set to keep API budget predictable.
  pollIntervalSec: PollIntervalSec;
  // When true, auto-polling is suspended if no relevant market is open.
  // When false, polling runs on the chosen cadence regardless of market hours.
  pollOnlyWhenMarketOpen: boolean;

  // --- T-W2-04: intraday snapshot cadence (added v2.0) ---
  // Minutes between intraday (intraday:true) snapshots while any market
  // is open. Old users with no stored value fall back to 15 via merge.
  snapshotIntervalMin: SnapshotIntervalMin;
}

const DEFAULT_SETTINGS: Settings = {
  baseCurrency: "USD",
  refreshInterval: 15,
  theme: "dark",
  snapshotTime: "23:59",

  // Sensible defaults for W2-03 polling (new field; old users fall back
  // to these via the merge below).
  pollIntervalSec: 60,
  pollOnlyWhenMarketOpen: true,

  // W2-04 default: one snapshot every 15 minutes of open market.
  snapshotIntervalMin: 15,
};

/** Narrow an unknown pollIntervalSec value back into the allowed union. */
function normalizePollInterval(v: unknown): PollIntervalSec {
  if (v === 30 || v === 60 || v === 300) return v;
  return DEFAULT_SETTINGS.pollIntervalSec;
}

/** Narrow an unknown snapshotIntervalMin value back into the allowed union. */
function normalizeSnapshotInterval(v: unknown): SnapshotIntervalMin {
  if (v === 5 || v === 15 || v === 30 || v === 60) return v;
  return DEFAULT_SETTINGS.snapshotIntervalMin;
}

/**
 * Read all settings from Dexie and merge with defaults.
 *
 * Old records (pre-W2-03) don't have `pollIntervalSec` /
 * `pollOnlyWhenMarketOpen` rows — the spread over `DEFAULT_SETTINGS`
 * supplies the defaults transparently.
 */
export function useSettings() {
  const rows = useLiveQuery(() => db.settings.toArray());

  if (rows === undefined) {
    return { settings: DEFAULT_SETTINGS, isLoading: true as const };
  }

  const overrides: Partial<Settings> = {};
  for (const row of rows) {
    if (!(row.key in DEFAULT_SETTINGS)) continue;
    // Light per-field normalisation so persisted garbage can't break types.
    if (row.key === "pollIntervalSec") {
      overrides.pollIntervalSec = normalizePollInterval(row.value);
    } else if (row.key === "pollOnlyWhenMarketOpen") {
      overrides.pollOnlyWhenMarketOpen = Boolean(row.value);
    } else if (row.key === "snapshotIntervalMin") {
      overrides.snapshotIntervalMin = normalizeSnapshotInterval(row.value);
    } else {
      (overrides as Record<string, unknown>)[row.key] = row.value;
    }
  }

  return {
    settings: { ...DEFAULT_SETTINGS, ...overrides } as Settings,
    isLoading: false as const,
  };
}

/**
 * Returns a function that updates a single setting by key.
 */
export function useUpdateSetting() {
  return useCallback(
    async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      await db.settings.put({ key, value });
    },
    [],
  );
}
