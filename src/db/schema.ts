import Dexie from "dexie";
import type { Table } from "dexie";
import type { Asset } from "@/types/asset";
import type { PriceCache } from "@/types/price";
import type { Snapshot } from "@/types/snapshot";

export interface SettingsRecord {
  key: string;
  value: unknown;
}

export class WealthLensDB extends Dexie {
  assets!: Table<Asset, string>;
  priceCache!: Table<PriceCache, string>;
  snapshots!: Table<Snapshot, string>;
  settings!: Table<SettingsRecord, string>;

  constructor() {
    super("WealthLensDB");

    this.version(1).stores({
      assets: "id, type, ticker",
      priceCache: "id, ticker, expiresAt",
      snapshots: "id, date",
      settings: "key",
    });
  }
}
