import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Asset, AssetType } from "@/types/asset";
import type { PriceResult } from "@/types/price";
import { useAddAsset, useUpdateAsset } from "@/hooks/useAssets";
import { formatCurrency, formatPercent } from "@/utils/formatters";
import { convertCurrency } from "@/utils/currency";
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

const ASSET_TYPE_VALUES: AssetType[] = [
  "us_stock",
  "cn_stock",
  "etf",
  "crypto",
  "gold",
  "forex",
  "real_estate",
  "vehicle",
  "cash",
  "other",
];

const CURRENCIES = ["USD", "CNY", "EUR", "GBP", "JPY"];

const TICKER_TYPES = new Set<AssetType>([
  "us_stock",
  "cn_stock",
  "etf",
  "crypto",
  "forex",
  "gold",
]);

const MANUAL_TYPES = new Set<AssetType>([
  "real_estate",
  "vehicle",
  "cash",
  "other",
]);

interface AssetFormProps {
  open: boolean;
  onClose: () => void;
  asset?: Asset;
  prices?: Map<string, PriceResult>;
  baseCurrency?: string;
}

export default function AssetForm({
  open,
  onClose,
  asset,
  prices,
  baseCurrency = "USD",
}: AssetFormProps) {
  const { t } = useTranslation();
  const addAsset = useAddAsset();
  const updateAsset = useUpdateAsset();

  const isEdit = !!asset;

  const [name, setName] = useState("");
  const [type, setType] = useState<AssetType>("us_stock");
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [costCurrency, setCostCurrency] = useState("USD");
  const [manualPrice, setManualPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (asset) {
      setName(asset.name);
      setType(asset.type);
      setTicker(asset.ticker ?? "");
      setQuantity(String(asset.quantity));
      setCostPrice(asset.costPrice != null ? String(asset.costPrice) : "");
      setCostCurrency(asset.costCurrency);
      setManualPrice(
        asset.manualPrice != null ? String(asset.manualPrice) : "",
      );
      setNotes(asset.notes ?? "");
    } else {
      resetForm();
    }
  }, [asset, open]);

  function resetForm() {
    setName("");
    setType("us_stock");
    setTicker("");
    setQuantity("");
    setCostPrice("");
    setCostCurrency("USD");
    setManualPrice("");
    setNotes("");
    setErrors({});
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t("assetForm.nameRequired");
    if (!quantity.trim() || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      newErrors.quantity = t("assetForm.quantityError");
    }
    if (
      MANUAL_TYPES.has(type) &&
      manualPrice.trim() &&
      isNaN(Number(manualPrice))
    ) {
      newErrors.manualPrice = t("assetForm.manualPriceError");
    }
    if (costPrice.trim() && isNaN(Number(costPrice))) {
      newErrors.costPrice = t("assetForm.costPriceError");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const data = {
      name: name.trim(),
      type,
      ticker: TICKER_TYPES.has(type) ? ticker.trim() || undefined : undefined,
      quantity: Number(quantity),
      costPrice: costPrice.trim() ? Number(costPrice) : undefined,
      costCurrency,
      manualPrice: MANUAL_TYPES.has(type) && manualPrice.trim()
        ? Number(manualPrice)
        : undefined,
      manualPriceUpdatedAt:
        MANUAL_TYPES.has(type) && manualPrice.trim()
          ? new Date()
          : undefined,
      notes: notes.trim() || undefined,
    };

    if (isEdit && asset) {
      await updateAsset(asset.id, data);
    } else {
      await addAsset(data);
    }

    onClose();
  }

  const showTicker = TICKER_TYPES.has(type);
  const showManualPrice = MANUAL_TYPES.has(type);

  // Preview computation
  const preview = useMemo(() => {
    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) return null;

    const isManual = MANUAL_TYPES.has(type);

    if (isManual) {
      return { isManual: true as const };
    }

    // Try to get current price from prices map
    const tickerVal = ticker.trim().toUpperCase();
    if (!tickerVal || !prices) return null;

    const priceResult = prices.get(tickerVal);
    if (!priceResult) return null;

    const currentPrice = priceResult.price;
    const priceCurrency = priceResult.currency;
    const totalValue = currentPrice * qty;
    const totalValueBase = convertCurrency(totalValue, priceCurrency, baseCurrency);

    let pnl: { amount: number; percent: number } | null = null;
    const cost = Number(costPrice);
    if (!isNaN(cost) && cost > 0) {
      const costTotal = convertCurrency(cost * qty, costCurrency, baseCurrency);
      const pnlAmount = totalValueBase - costTotal;
      const pnlPercent = costTotal > 0 ? pnlAmount / costTotal : 0;
      pnl = { amount: pnlAmount, percent: pnlPercent };
    }

    return {
      isManual: false as const,
      ticker: tickerVal,
      qty,
      currentPrice,
      priceCurrency,
      totalValue: totalValueBase,
      costTotal:
        !isNaN(cost) && cost > 0
          ? convertCurrency(cost * qty, costCurrency, baseCurrency)
          : null,
      pnl,
    };
  }, [
    type,
    ticker,
    quantity,
    costPrice,
    costCurrency,
    prices,
    baseCurrency,
  ]);

  const monoStyle: React.CSSProperties = {
    fontFamily: "var(--font-monospace)",
    fontFeatureSettings: '"tnum"',
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("assetForm.editAsset") : t("assetForm.addAsset")}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("assetForm.editDescription")
              : t("assetForm.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="asset-name">{t("assetForm.name")}</Label>
            <Input
              id="asset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("assetForm.namePlaceholder")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>{t("assetForm.type")}</Label>
            <Select value={type} onValueChange={(v) => setType(v as AssetType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSET_TYPE_VALUES.map((val) => (
                  <SelectItem key={val} value={val}>
                    {t(`assetTypes.${val}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ticker */}
          {showTicker && (
            <div className="space-y-1.5">
              <Label htmlFor="asset-ticker">{t("assetForm.ticker")}</Label>
              <Input
                id="asset-ticker"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder={t("assetForm.tickerPlaceholder")}
              />
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-1.5">
            <Label htmlFor="asset-quantity">{t("assetForm.quantity")}</Label>
            <Input
              id="asset-quantity"
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={t("assetForm.quantityPlaceholder")}
              aria-invalid={!!errors.quantity}
            />
            {errors.quantity && (
              <p className="text-xs text-destructive">{errors.quantity}</p>
            )}
          </div>

          {/* Cost Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="asset-cost-price">{t("assetForm.costPrice")}</Label>
              <Input
                id="asset-cost-price"
                type="number"
                step="any"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder={t("assetForm.optional")}
                aria-invalid={!!errors.costPrice}
              />
              {errors.costPrice && (
                <p className="text-xs text-destructive">{errors.costPrice}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t("assetForm.costCurrency")}</Label>
              <Select
                value={costCurrency}
                onValueChange={(v) => setCostCurrency(v as string)}
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

          {/* Manual Price */}
          {showManualPrice && (
            <div className="space-y-1.5">
              <Label htmlFor="asset-manual-price">{t("assetForm.manualPrice")}</Label>
              <Input
                id="asset-manual-price"
                type="number"
                step="any"
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
                placeholder={t("assetForm.manualPricePlaceholder")}
                aria-invalid={!!errors.manualPrice}
              />
              {errors.manualPrice && (
                <p className="text-xs text-destructive">
                  {errors.manualPrice}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="asset-notes">{t("assetForm.notes")}</Label>
            <Textarea
              id="asset-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("assetForm.notesPlaceholder")}
              rows={2}
            />
          </div>

          {/* Preview section */}
          {preview && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid var(--color-base-20)",
                background: "var(--color-base-05)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Preview
              </div>
              {preview.isManual ? (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--color-manual)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>{"\u26A0\uFE0F"}</span>
                  <span>
                    No live price available for this asset type. You can
                    update the estimate manually at any time.
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <div style={{ color: "var(--color-text-normal)" }}>
                    <span style={monoStyle}>
                      {preview.ticker} x {preview.qty} @ current{" "}
                      {formatCurrency(preview.currentPrice, preview.priceCurrency)}{" "}
                      = {formatCurrency(preview.totalValue, baseCurrency)}
                    </span>
                  </div>
                  {preview.costTotal !== null && preview.pnl !== null && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      <span style={monoStyle}>
                        Cost basis:{" "}
                        {formatCurrency(preview.costTotal, baseCurrency)}
                        {" \u00B7 "}
                        Unrealized P&L:{" "}
                      </span>
                      <span
                        style={{
                          ...monoStyle,
                          color:
                            preview.pnl.amount >= 0
                              ? "var(--color-gain)"
                              : "var(--color-loss)",
                        }}
                      >
                        {preview.pnl.amount >= 0 ? "+" : ""}
                        {formatCurrency(
                          Math.abs(preview.pnl.amount),
                          baseCurrency,
                        )}{" "}
                        ({formatPercent(preview.pnl.percent)})
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("assetForm.cancel")}
            </Button>
            <Button type="submit">{isEdit ? t("assetForm.saveChanges") : t("assetForm.addAsset")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
