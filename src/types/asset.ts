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

  // --- v2 additions (W1-04) ---
  // isDemo marks assets loaded by Demo Mode (W4). Indexed in Dexie v2 so the
  // Demo exit path can wipe all demo rows in one pass without touching real
  // user data. Persisted as `false` for pre-v2 records during migration.
  isDemo?: boolean;

  // subType is a free-form label ("Tech", "Dividend", "Growth", ...) used by
  // W3 exposure analytics. Optional; user-editable in AssetForm (W2+).
  subType?: string;

  // region is an ISO-3166 country or region code ("US", "CN", "HK", "JP",
  // "EU", "Global"). Drives W3 geographic/currency exposure charts and
  // benchmark defaulting (US -> S&P500, CN -> CSI300, etc).
  region?: string;
}
