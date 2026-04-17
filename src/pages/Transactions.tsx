import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Transaction, TransactionType } from "@/types/transaction";
import {
  useTransactions,
  useAddTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from "@/hooks/useTransactions";
import { useSettings } from "@/stores/settingsStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CURRENCIES = ["USD", "CNY", "EUR", "GBP", "JPY", "HKD"];

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Cash Flow management page.
 *
 * Lists the user's account-level deposits and withdrawals (NOT trades).
 * These records feed TWR / XIRR — without them the Dashboard's Returns
 * card can't distinguish "I added money" from "I made money".
 *
 * Actions: add, edit, delete. Display-only fields pull the user's base
 * currency symbol for context but each transaction preserves the currency
 * it was entered in.
 */
export default function Transactions() {
  const { t } = useTranslation();
  const { transactions, isLoading } = useTransactions();
  const { settings } = useSettings();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>();
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const sorted = useMemo(
    () =>
      [...transactions].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        const ta =
          a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const tb =
          b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return tb - ta;
      }),
    [transactions],
  );

  function handleAdd() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function handleEdit(txn: Transaction) {
    setEditing(txn);
    setFormOpen(true);
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 0",
          color: "var(--color-text-faint)",
        }}
      >
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div style={{ padding: "0 4px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--color-text-normal)",
          }}
        >
          {t("transactions.title")}
        </h1>
        <button
          onClick={handleAdd}
          style={{
            height: 32,
            padding: "0 14px",
            borderRadius: 6,
            border: "1px solid var(--color-accent-kerdos)",
            background: "var(--color-accent-subtle)",
            color: "var(--color-accent-kerdos)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 15 }}>{"\u002B"}</span>
          {t("transactions.add")}
        </button>
      </div>

      {/* Helper caption */}
      <div
        style={{
          fontSize: 12,
          color: "var(--color-text-muted)",
          marginBottom: 16,
          lineHeight: 1.5,
        }}
      >
        {t("transactions.helper")}
      </div>

      {/* Table or empty state */}
      {sorted.length === 0 ? (
        <div
          style={{
            padding: "48px 16px",
            textAlign: "center",
            color: "var(--color-text-faint)",
            border: "1px dashed var(--color-base-20)",
            borderRadius: 8,
            background: "var(--color-base-10)",
          }}
        >
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            {t("transactions.empty.title")}
          </div>
          <div style={{ fontSize: 12 }}>{t("transactions.empty.hint")}</div>
        </div>
      ) : (
        <div
          style={{
            background: "var(--color-base-10)",
            border: "1px solid var(--color-base-20)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  background: "var(--color-base-05)",
                  color: "var(--color-text-muted)",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <Th>{t("transactions.date")}</Th>
                <Th>{t("transactions.typeLabel")}</Th>
                <Th align="right">{t("transactions.amount")}</Th>
                <Th>{t("transactions.currency")}</Th>
                <Th>{t("transactions.note")}</Th>
                <Th align="right">{t("transactions.actions")}</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((txn) => {
                const isDeposit = txn.type === "deposit";
                return (
                  <tr
                    key={txn.id}
                    style={{
                      borderTop: "1px solid var(--color-base-20)",
                      color: "var(--color-text-normal)",
                    }}
                  >
                    <Td mono>{txn.date}</Td>
                    <Td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 500,
                          color: isDeposit
                            ? "var(--color-gain)"
                            : "var(--color-loss)",
                          background: isDeposit
                            ? "var(--color-gain-bg)"
                            : "var(--color-loss-bg)",
                        }}
                      >
                        {isDeposit
                          ? t("transactions.type.deposit")
                          : t("transactions.type.withdraw")}
                      </span>
                    </Td>
                    <Td align="right" mono>
                      {isDeposit ? "+" : "-"}
                      {txn.amount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Td>
                    <Td mono>{txn.currency}</Td>
                    <Td>
                      <span
                        style={{
                          color: "var(--color-text-muted)",
                          fontSize: 12,
                        }}
                      >
                        {txn.note ?? ""}
                      </span>
                    </Td>
                    <Td align="right">
                      <div
                        style={{
                          display: "inline-flex",
                          gap: 8,
                        }}
                      >
                        <IconButton
                          onClick={() => handleEdit(txn)}
                          title={t("transactions.edit")}
                        >
                          {"\u270E"}
                        </IconButton>
                        <IconButton
                          onClick={() => setDeleting(txn)}
                          title={t("transactions.delete")}
                        >
                          {"\u2715"}
                        </IconButton>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form dialog */}
      <TransactionForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(undefined);
        }}
        transaction={editing}
        defaultCurrency={settings.baseCurrency}
      />

      {/* Delete confirmation */}
      <Dialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("transactions.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("transactions.deleteConfirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t("common.cancel")}
            </Button>
            <ConfirmDelete
              id={deleting?.id}
              onDone={() => setDeleting(null)}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      style={{
        padding: "10px 12px",
        textAlign: align ?? "left",
        fontWeight: 600,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  mono,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
}) {
  return (
    <td
      style={{
        padding: "10px 12px",
        textAlign: align ?? "left",
        fontFamily: mono ? "var(--font-monospace)" : undefined,
        verticalAlign: "middle",
      }}
    >
      {children}
    </td>
  );
}

function IconButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 24,
        height: 24,
        borderRadius: 4,
        border: "1px solid var(--color-base-20)",
        background: "transparent",
        color: "var(--color-text-muted)",
        fontSize: 11,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

function ConfirmDelete({
  id,
  onDone,
}: {
  id: string | undefined;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const del = useDeleteTransaction();
  return (
    <Button
      variant="destructive"
      onClick={async () => {
        if (id) await del(id);
        onDone();
      }}
    >
      {t("common.delete")}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction;
  defaultCurrency: string;
}

function TransactionForm({
  open,
  onClose,
  transaction,
  defaultCurrency,
}: TransactionFormProps) {
  const { t } = useTranslation();
  const add = useAddTransaction();
  const update = useUpdateTransaction();
  const isEdit = !!transaction;

  const [date, setDate] = useState<string>(todayStr());
  const [type, setType] = useState<TransactionType>("deposit");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>(defaultCurrency);
  const [note, setNote] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset / prefill when dialog opens or the edited row changes.
  useEffect(() => {
    if (!open) return;
    if (transaction) {
      setDate(transaction.date);
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setCurrency(transaction.currency);
      setNote(transaction.note ?? "");
      setErrors({});
    } else {
      setDate(todayStr());
      setType("deposit");
      setAmount("");
      setCurrency(defaultCurrency);
      setNote("");
      setErrors({});
    }
    // Setters are stable; defaultCurrency only matters on new-form open
    // where the dialog already re-ran via `open` changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transaction?.id]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!date) next.date = t("transactions.errors.dateRequired");
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      next.amount = t("transactions.errors.amountPositive");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const data = {
      date,
      type,
      amount: Number(amount),
      currency,
      note: note.trim() || undefined,
    };
    if (isEdit && transaction) {
      await update(transaction.id, data);
    } else {
      await add(data);
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("transactions.form.editTitle")
              : t("transactions.form.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("transactions.form.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="txn-date">{t("transactions.date")}</Label>
            <Input
              id="txn-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-invalid={!!errors.date}
            />
            {errors.date && (
              <p className="text-xs text-destructive">{errors.date}</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>{t("transactions.typeLabel")}</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as TransactionType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit">
                  {t("transactions.type.deposit")}
                </SelectItem>
                <SelectItem value="withdraw">
                  {t("transactions.type.withdraw")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="txn-amount">{t("transactions.amount")}</Label>
              <Input
                id="txn-amount"
                type="number"
                step="any"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={!!errors.amount}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t("transactions.currency")}</Label>
              <Select
                value={currency}
                onValueChange={(v) => v && setCurrency(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="txn-note">{t("transactions.note")}</Label>
            <Textarea
              id="txn-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={t("transactions.notePlaceholder")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit">
              {isEdit ? t("common.save") : t("transactions.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
