import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import { db } from "@/db";
import type { Asset } from "@/types/asset";

/**
 * Live-query all assets.
 */
export function useAssets() {
  const assets = useLiveQuery(() => db.assets.toArray());
  return { assets: assets ?? [], isLoading: assets === undefined };
}

/**
 * Live-query a single asset by id.
 */
export function useAsset(id: string | undefined) {
  const asset = useLiveQuery(
    () => (id ? db.assets.get(id) : undefined),
    [id],
  );
  return asset;
}

/**
 * Returns a function that adds a new asset.
 * The caller provides everything except `id`, `createdAt`, and `updatedAt`.
 */
export function useAddAsset() {
  return useCallback(
    async (data: Omit<Asset, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date();
      const asset: Asset = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      await db.assets.add(asset);
      return asset;
    },
    [],
  );
}

/**
 * Returns a function that updates an existing asset by id.
 */
export function useUpdateAsset() {
  return useCallback(
    async (id: string, changes: Partial<Omit<Asset, "id" | "createdAt">>) => {
      await db.assets.update(id, { ...changes, updatedAt: new Date() });
    },
    [],
  );
}

/**
 * Returns a function that deletes an asset by id.
 */
export function useDeleteAsset() {
  return useCallback(async (id: string) => {
    await db.assets.delete(id);
  }, []);
}
