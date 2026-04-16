import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import { db } from "@/db";
import type { Snapshot, SnapshotBreakdown } from "@/types/snapshot";

/**
 * Live-query recent snapshots. Defaults to last 30 days.
 */
export function useSnapshots(days = 30) {
  const snapshots = useLiveQuery(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10); // "YYYY-MM-DD"
    return db.snapshots.where("date").aboveOrEqual(cutoffStr).sortBy("date");
  }, [days]);

  return { snapshots: snapshots ?? [], isLoading: snapshots === undefined };
}

/**
 * Returns a function that creates a new snapshot.
 */
export function useAddSnapshot() {
  return useCallback(
    async (data: {
      date: string;
      totalNetWorth: number;
      currency: string;
      breakdown: SnapshotBreakdown[];
    }) => {
      const snapshot: Snapshot = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      };
      await db.snapshots.add(snapshot);
      return snapshot;
    },
    [],
  );
}
