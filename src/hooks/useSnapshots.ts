import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import { db } from "@/db";
import type { Snapshot, SnapshotBreakdown } from "@/types/snapshot";

export interface UseSnapshotsOptions {
  /**
   * When true, include intraday snapshots (intraday:true) in the result.
   * Default is `false` to preserve legacy behaviour — callers like
   * NetWorth change calc, History table, and Settings export expect
   * one snapshot per day.
   */
  includeIntraday?: boolean;
}

/**
 * Live-query recent snapshots. Defaults to last 30 days, daily only.
 *
 * Back-compatible signature: the legacy one-arg form `useSnapshots(7)`
 * still behaves as before (daily snapshots only). Pass
 * `useSnapshots(7, { includeIntraday: true })` to also pull in the
 * 15-min intraday rows written by the W2-04 poller.
 */
export function useSnapshots(
  days = 30,
  options: UseSnapshotsOptions = {},
) {
  const includeIntraday = options.includeIntraday ?? false;

  const snapshots = useLiveQuery(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10); // "YYYY-MM-DD"
    const coll = db.snapshots.where("date").aboveOrEqual(cutoffStr);
    if (includeIntraday) {
      // Sort by createdAt ascending so intraday ticks line up within a
      // day in chronological order (date-only sort can't disambiguate
      // same-day rows). daily snapshots also carry createdAt, so they
      // interleave naturally.
      return coll.toArray().then((rows) =>
        rows.sort((a, b) => {
          if (a.date !== b.date) return a.date < b.date ? -1 : 1;
          const ta =
            a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
          const tb =
            b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
          return ta - tb;
        }),
      );
    }
    return coll.filter((s) => !s.intraday).sortBy("date");
  }, [days, includeIntraday]);

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
