import Dexie from "dexie";
import type { Table } from "dexie";
import type { Asset } from "@/types/asset";
import type { PriceCache } from "@/types/price";
import type { Snapshot } from "@/types/snapshot";
import type { Transaction } from "@/types/transaction";

export interface SettingsRecord {
  key: string;
  value: unknown;
}

// NOTE: Class and DB names "WealthLensDB" are legacy identifiers kept for
// data preservation — renaming would wipe existing users' IndexedDB data.
// The product brand is Kerdos; only the on-disk DB name stays legacy.
//
// Schema history (see migrations.ts for the reviewer-facing changelog):
//   v1 — initial schema (assets / priceCache / snapshots / settings)
//   v2 — +assets.isDemo, +snapshots.intraday, backfill both
//   v3 — +transactions table (T-W3-02/03 TWR/XIRR/MaxDD cash-flow input).
//        New table only — no upgrade callback needed because no pre-existing
//        rows have to be rewritten.
export class WealthLensDB extends Dexie {
  assets!: Table<Asset, string>;
  priceCache!: Table<PriceCache, string>;
  snapshots!: Table<Snapshot, string>;
  settings!: Table<SettingsRecord, string>;
  transactions!: Table<Transaction, string>;

  constructor() {
    super("WealthLensDB");

    // v1 — initial schema (pre-v2.0 product rebuild)
    this.version(1).stores({
      assets: "id, type, ticker",
      priceCache: "id, ticker, expiresAt",
      snapshots: "id, date",
      settings: "key",
    });

    // v2 — Kerdos v2.0 additions (T-W1-04)
    //   · assets: +isDemo index (Demo Mode wipe path)
    //   · snapshots: +intraday index (15-min poller retention)
    //   · upgrade callback backfills defaults so Dexie's equals(false) lookups
    //     find pre-v2 rows (undefined values are NOT indexed in Dexie).
    this.version(2)
      .stores({
        assets: "id, type, ticker, isDemo",
        priceCache: "id, ticker, expiresAt",
        snapshots: "id, date, intraday",
        settings: "key",
      })
      .upgrade(async (tx) => {
        await tx
          .table("assets")
          .toCollection()
          .modify((a: Asset) => {
            if (a.isDemo === undefined) a.isDemo = false;
          });
        await tx
          .table("snapshots")
          .toCollection()
          .modify((s: Snapshot) => {
            if (s.intraday === undefined) s.intraday = false;
          });
      });

    // v3 — Kerdos v2.0 additions (T-W3-02 + T-W3-03)
    //   · transactions: new table holding account-level deposits/withdrawals.
    //     These flows feed TWR (segment boundaries) and XIRR (cashflow
    //     timeline). Indexed by `date` for range scans and `type` for
    //     deposit-only / withdraw-only views.
    //   · No upgrade callback — the table is new, nothing to backfill. Dexie
    //     creates the object store on first access in v3.
    //   · All prior stores (assets / priceCache / snapshots / settings) are
    //     re-declared unchanged so Dexie carries them forward.
    this.version(3).stores({
      assets: "id, type, ticker, isDemo",
      priceCache: "id, ticker, expiresAt",
      snapshots: "id, date, intraday",
      settings: "key",
      transactions: "id, date, type",
    });
  }
}
