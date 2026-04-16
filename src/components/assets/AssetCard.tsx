import { useTranslation } from "react-i18next";
import type { Asset } from "@/types/asset";
import type { PriceResult } from "@/types/price";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, relativeTime } from "@/utils/formatters";
import { convertCurrency } from "@/utils/currency";
import { Pencil, Trash2, AlertTriangle } from "lucide-react";

const MANUAL_TYPES = new Set([
  "real_estate",
  "vehicle",
  "cash",
  "other",
]);

interface AssetCardProps {
  asset: Asset;
  price: PriceResult | null;
  baseCurrency: string;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
}

export default function AssetCard({
  asset,
  price,
  baseCurrency,
  onEdit,
  onDelete,
}: AssetCardProps) {
  const { t } = useTranslation();
  const isManual = MANUAL_TYPES.has(asset.type);

  // Determine unit price
  let unitPrice = 0;
  let priceCurrency = baseCurrency;
  if (isManual && asset.manualPrice != null) {
    unitPrice = asset.manualPrice;
    priceCurrency = asset.costCurrency;
  } else if (price) {
    unitPrice = price.price;
    priceCurrency = price.currency;
  }

  // Total value in price currency
  const totalValueRaw = unitPrice * asset.quantity;

  // Convert to base currency
  const totalValue = convertCurrency(totalValueRaw, priceCurrency, baseCurrency);

  // Gain/loss calculation
  let gainLossPercent: number | null = null;
  if (asset.costPrice != null && asset.costPrice > 0) {
    const costInBase = convertCurrency(
      asset.costPrice * asset.quantity,
      asset.costCurrency,
      baseCurrency,
    );
    if (costInBase > 0) {
      gainLossPercent = (totalValue - costInBase) / costInBase;
    }
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="truncate">{asset.name}</span>
          <Badge variant="secondary" className="shrink-0">
            {t(`assetTypes.${asset.type}`)}
          </Badge>
        </CardTitle>
        <CardAction>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onEdit(asset)}
              aria-label={t("assetCard.editAsset")}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onDelete(asset)}
              aria-label={t("assetCard.deleteAsset")}
            >
              <Trash2 />
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            {asset.ticker && (
              <p className="text-xs text-muted-foreground">{asset.ticker}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("assetCard.qty")} {asset.quantity}
              {unitPrice > 0 && (
                <span>
                  {" "}
                  @ {formatCurrency(unitPrice, priceCurrency)}
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">
              {formatCurrency(totalValue, baseCurrency)}
            </p>
            {gainLossPercent !== null && (
              <p
                className={
                  gainLossPercent >= 0
                    ? "text-xs text-green-500"
                    : "text-xs text-red-500"
                }
              >
                {gainLossPercent >= 0 ? "+" : ""}
                {(gainLossPercent * 100).toFixed(2)}%
              </p>
            )}
          </div>
        </div>
        {isManual && asset.manualPriceUpdatedAt && (
          <div className="mt-2 flex items-center gap-1 text-xs text-amber-500">
            <AlertTriangle className="size-3" />
            <span>
              {t("assetCard.manualUpdated", { time: relativeTime(new Date(asset.manualPriceUpdatedAt)) })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
