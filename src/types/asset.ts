export type AssetType =
  | "us_stock"
  | "cn_stock"
  | "etf"
  | "crypto"
  | "gold"
  | "forex"
  | "real_estate"
  | "vehicle"
  | "cash"
  | "other";

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  ticker?: string;
  quantity: number;
  costPrice?: number;
  costCurrency: string;
  manualPrice?: number;
  manualPriceUpdatedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
