/**
 * Demo Mode lifecycle (T-W4-01).
 *
 * Responsibilities:
 *   · enterDemoMode(days): wipe user-visible tables (assets + snapshots),
 *     then bulk-load the deterministic demo portfolio from
 *     src/data/demo-portfolio.ts. All demo rows carry `isDemo: true` on
 *     assets and are tagged on snapshots via the `demo-snap-YYYYMMDD` id
 *     prefix (see `generateDemoSnapshots`).
 *   · exitDemoMode(): remove every demo row so the user lands on the
 *     empty-state dashboard. Real user data (non-demo) is untouched.
 *   · isInDemoMode(): cheap check used by the top-of-app banner.
 *
 * Notes:
 *   · We deliberately DO NOT touch `settings` or `priceCache` — those
 *     are either user preferences or shared caches and should survive
 *     entering/leaving demo mode.
 *   · Dexie's `.filter()` runs a JS scan rather than using the IndexedDB
 *     index. We use filter here because IndexedDB itself rejects `true`
 *     / `false` as valid keys, so `where('isDemo').equals(true)` is
 *     unreliable across browsers. A linear scan over ~20 assets and a
 *     few hundred snapshots is trivially fast.
 *   · All write paths are guarded by try/catch with console.error — a
 *     demo-mode failure must never crash the shell.
 */
import { db } from "@/db";
import { buildDemoPortfolio } from "@/data/demo-portfolio";

/** Prefix used by every demo snapshot id (see generateDemoSnapshots). */
const DEMO_SNAPSHOT_ID_PREFIX = "demo-snap-";

/**
 * Enter Demo Mode. Clears any existing assets/snapshots and loads the
 * 20-asset demo portfolio with `days` daily snapshots (default 90).
 *
 * The UI layer is responsible for warning the user BEFORE calling this —
 * by the time we're here, we assume consent to wipe.
 */
export async function enterDemoMode(days: number = 90): Promise<void> {
  try {
    const { assets, snapshots } = buildDemoPortfolio(days);

    // Transactional wipe + load so a partial failure can't leave the DB
    // half-populated. We only touch the two user-facing tables.
    await db.transaction("rw", db.assets, db.snapshots, async () => {
      await db.assets.clear();
      await db.snapshots.clear();
      await db.assets.bulkPut(assets);
      await db.snapshots.bulkPut(snapshots);
    });
  } catch (err) {
    console.error("[demoMode] enterDemoMode failed:", err);
    throw err;
  }
}

/**
 * Exit Demo Mode. Deletes every row tagged as demo, leaving real user
 * data intact. If the user has no real data (the common case after
 * entering demo from a fresh install), they land on the empty-state
 * dashboard.
 */
export async function exitDemoMode(): Promise<void> {
  try {
    await db.transaction("rw", db.assets, db.snapshots, async () => {
      // Assets: linear scan on isDemo. See module-level note on why we
      // don't use the dedicated index.
      await db.assets.filter((a) => a.isDemo === true).delete();
      // Snapshots: demo rows are identified by their id prefix. This
      // avoids needing a separate isDemo field on Snapshot.
      await db.snapshots
        .filter((s) => s.id.startsWith(DEMO_SNAPSHOT_ID_PREFIX))
        .delete();
    });
  } catch (err) {
    console.error("[demoMode] exitDemoMode failed:", err);
    throw err;
  }
}

/**
 * Is the current DB in Demo Mode? True iff there is at least one asset
 * with `isDemo === true`. Cheap enough to drive a `useLiveQuery` banner.
 */
export async function isInDemoMode(): Promise<boolean> {
  try {
    const count = await db.assets
      .filter((a) => a.isDemo === true)
      .count();
    return count > 0;
  } catch (err) {
    console.error("[demoMode] isInDemoMode check failed:", err);
    return false;
  }
}
