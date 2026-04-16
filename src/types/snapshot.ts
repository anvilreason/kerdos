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
}
