// Migration log — the actual schema bumps live in schema.ts, declared via
// Dexie's `this.version(N).stores({...}).upgrade(tx => ...)`. This file
// documents each bump for reviewers.
//
// v1 (initial, pre-v2.0 product rebuild):
//   assets:     id, type, ticker
//   priceCache: id, ticker, expiresAt
//   snapshots:  id, date
//   settings:   key
//
// v2 (Kerdos v2.0 — T-W1-04, 2026-04-17):
//   assets:     +isDemo index       (Demo Mode / real-data separation)
//   snapshots:  +intraday index     (15-min intraday poller retention)
//   upgrade:    backfill isDemo=false, intraday=false on existing rows
//               (Dexie's equals(false) queries skip undefined values)
//
// v3 (Kerdos v2.0 — T-W3-02 / T-W3-03, 2026-04-17):
//   transactions: NEW table
//                 primary key `id`, indexed on `date` and `type`
//                 holds account-level cash flows (deposit / withdraw) that
//                 feed TWR segmentation and XIRR cashflow timelines
//   upgrade:      none — new table only, nothing to backfill
//
// Future bumps go in schema.ts; append a summary entry here.
export const MIGRATION_LOG = [
  { version: 1, summary: "Initial schema" },
  {
    version: 2,
    summary:
      "Add isDemo (assets) and intraday (snapshots) indexes + backfill defaults",
  },
  {
    version: 3,
    summary:
      "Add transactions table (account-level cash flows for TWR/XIRR/MaxDD)",
  },
] as const;
