import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import { db } from "@/db";
import type { Transaction } from "@/types/transaction";

/**
 * Live-query all transactions sorted by date ascending.
 *
 * Sort is stable on `date` (YYYY-MM-DD string compare) — for two rows
 * on the same date we fall back to `createdAt` so the order at least
 * matches the order they were entered in.
 */
export function useTransactions() {
  const transactions = useLiveQuery(() =>
    db.transactions
      .orderBy("date")
      .toArray()
      .then((rows) =>
        rows.sort((a, b) => {
          if (a.date !== b.date) return a.date < b.date ? -1 : 1;
          const ta =
            a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
          const tb =
            b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
          return ta - tb;
        }),
      ),
  );
  return {
    transactions: transactions ?? [],
    isLoading: transactions === undefined,
  };
}

/**
 * Returns a function that adds a new transaction. Caller provides
 * everything except id / createdAt / updatedAt.
 */
export function useAddTransaction() {
  return useCallback(
    async (data: Omit<Transaction, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date();
      const txn: Transaction = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      await db.transactions.add(txn);
      return txn;
    },
    [],
  );
}

/**
 * Returns a function that updates an existing transaction by id. `id`
 * and `createdAt` are not user-editable.
 */
export function useUpdateTransaction() {
  return useCallback(
    async (
      id: string,
      changes: Partial<Omit<Transaction, "id" | "createdAt">>,
    ) => {
      await db.transactions.update(id, { ...changes, updatedAt: new Date() });
    },
    [],
  );
}

/**
 * Returns a function that deletes a transaction by id.
 */
export function useDeleteTransaction() {
  return useCallback(async (id: string) => {
    await db.transactions.delete(id);
  }, []);
}
