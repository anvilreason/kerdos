import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import { db } from "@/db";

export interface Settings {
  baseCurrency: string;
  refreshInterval: number;
  theme: string;
  snapshotTime: string;
}

const DEFAULT_SETTINGS: Settings = {
  baseCurrency: "USD",
  refreshInterval: 15,
  theme: "dark",
  snapshotTime: "23:59",
};

/**
 * Read all settings from Dexie and merge with defaults.
 */
export function useSettings() {
  const rows = useLiveQuery(() => db.settings.toArray());

  if (rows === undefined) {
    return { settings: DEFAULT_SETTINGS, isLoading: true as const };
  }

  const overrides: Partial<Settings> = {};
  for (const row of rows) {
    if (row.key in DEFAULT_SETTINGS) {
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
