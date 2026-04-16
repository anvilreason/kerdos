import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { Asset } from "@/types/asset";
import { useAssets, useDeleteAsset } from "@/hooks/useAssets";
import { usePrices } from "@/hooks/usePrices";
import { useSettings } from "@/stores/settingsStore";
import AssetList from "@/components/assets/AssetList";
import AssetForm from "@/components/assets/AssetForm";
import DetailPanel from "@/components/layout/DetailPanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function Assets() {
  const { t } = useTranslation();
  const { assets, isLoading } = useAssets();
  const { prices } = usePrices(assets);
  const { settings } = useSettings();
  const deleteAsset = useDeleteAsset();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>();
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  function handleEdit(asset: Asset) {
    setEditingAsset(asset);
    setFormOpen(true);
  }

  function handleAdd() {
    setEditingAsset(undefined);
    setFormOpen(true);
  }

  function handleFormClose() {
    setFormOpen(false);
    setEditingAsset(undefined);
  }

  async function handleConfirmDelete() {
    if (deletingAsset) {
      await deleteAsset(deletingAsset.id);
      if (selectedAsset?.id === deletingAsset.id) {
        setSelectedAsset(null);
      }
      setDeletingAsset(null);
    }
  }

  const handleSelectAsset = useCallback(
    (asset: Asset) => {
      setSelectedAsset((prev) => (prev?.id === asset.id ? null : asset));
    },
    [],
  );

  const handleDetailEdit = useCallback(
    (asset: Asset) => {
      handleEdit(asset);
    },
    [],
  );

  const handleDetailDelete = useCallback(
    (asset: Asset) => {
      setDeletingAsset(asset);
    },
    [],
  );

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
        {t("assets.loading")}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Main content */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "0 4px",
        }}
      >
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
            {t("assets.title")}
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
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--color-accent-hover)";
              (e.currentTarget as HTMLElement).style.color =
                "var(--color-base-00)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--color-accent-subtle)";
              (e.currentTarget as HTMLElement).style.color =
                "var(--color-accent-kerdos)";
            }}
          >
            <span style={{ fontSize: 15 }}>{"\u002B"}</span>
            {t("assets.addAsset")}
          </button>
        </div>

        {/* Search bar */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid var(--color-base-20)",
              background: "var(--color-base-05)",
            }}
          >
            <span
              style={{ fontSize: 14, color: "var(--color-text-faint)" }}
            >
              {"\uD83D\uDD0D"}
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets, tickers..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--color-text-normal)",
                fontSize: 13,
                fontFamily: "var(--font-interface)",
              }}
            />
          </div>
        </div>

        {/* Asset list */}
        <AssetList
          assets={assets}
          prices={prices}
          baseCurrency={settings.baseCurrency}
          searchQuery={searchQuery}
          onEdit={handleEdit}
          onDelete={setDeletingAsset}
          onSelect={handleSelectAsset}
        />

        {/* Add form dialog */}
        <AssetForm
          open={formOpen}
          onClose={handleFormClose}
          asset={editingAsset}
          prices={prices}
          baseCurrency={settings.baseCurrency}
        />

        {/* Delete confirmation dialog */}
        <Dialog
          open={deletingAsset !== null}
          onOpenChange={(o) => !o && setDeletingAsset(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("assets.deleteTitle")}</DialogTitle>
              <DialogDescription>
                {t("assets.deleteConfirm", { name: deletingAsset?.name })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingAsset(null)}>
                {t("assets.cancel")}
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                {t("assets.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Detail panel */}
      {selectedAsset && (
        <DetailPanel
          asset={selectedAsset}
          price={
            selectedAsset.ticker
              ? prices.get(selectedAsset.ticker) ?? null
              : null
          }
          baseCurrency={settings.baseCurrency}
          onClose={() => setSelectedAsset(null)}
          onEdit={handleDetailEdit}
          onDelete={handleDetailDelete}
        />
      )}
    </div>
  );
}
