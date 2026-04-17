export interface SnapshotBreakdown {
  assetId: string;
  value: number;
  price: number;
}

export interface Snapshot {
  id: string;
  date: string; // "YYYY-MM-DD"
  totalNetWorth: number;
  currency: string;
  breakdown: SnapshotBreakdown[];
  createdAt: Date;

  // --- v2 additions (W1-04) ---
  // intraday marks snapshots taken during market hours by the W2-04 poller
  // (every ~15 min). False/undefined = end-of-day snapshot. Indexed so the
  // retention job can prune old intraday rows (>90 days) without scanning.
  intraday?: boolean;
}
