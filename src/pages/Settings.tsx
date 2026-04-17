import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettings, useUpdateSetting } from "@/stores/settingsStore";
import { useAssets } from "@/hooks/useAssets";
import { useSnapshots } from "@/hooks/useSnapshots";
import { exportToJSON, parseImportJSON, downloadFile } from "@/utils/export";
import { formatDate } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { db } from "@/db";
import { Download, Upload, Trash2 } from "lucide-react";

const CURRENCIES = ["USD", "CNY", "EUR", "GBP", "JPY"];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '\u4e2d\u6587' },
  { code: 'fr', name: 'Fran\u00e7ais' },
  { code: 'ru', name: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439' },
  { code: 'es', name: 'Espa\u00f1ol' },
  { code: 'ar', name: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629' },
  { code: 'hi', name: '\u0939\u093f\u0928\u094d\u0926\u0940' },
  { code: 'bn', name: '\u09ac\u09be\u0982\u09b2\u09be' },
  { code: 'pt', name: 'Portugu\u00eas' },
  { code: 'ja', name: '\u65e5\u672c\u8a9e' },
  { code: 'ur', name: '\u0627\u0631\u062f\u0648' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pa', name: '\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40' },
  { code: 'sw', name: 'Kiswahili' },
];

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();
  const { assets } = useAssets();
  const { snapshots } = useSnapshots(9999);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  async function handleThemeChange(theme: string) {
    await updateSetting("theme", theme);
    applyTheme(theme);
  }

  function applyTheme(theme: string) {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      // system
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      if (prefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }

  function handleExportAll() {
    const json = exportToJSON({ assets, snapshots });
    downloadFile(
      json,
      `kerdos-full-export-${formatDate(new Date())}.json`,
      "application/json",
    );
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = parseImportJSON(text);

      for (const asset of data.assets) {
        await db.assets.put(asset);
      }
      for (const snapshot of data.snapshots) {
        await db.snapshots.put(snapshot);
      }

      alert(
        `Imported ${data.assets.length} assets and ${data.snapshots.length} snapshots.`,
      );
    } catch (err) {
      alert(
        `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleClearAll() {
    await db.assets.clear();
    await db.snapshots.clear();
    await db.priceCache.clear();
    await db.settings.clear();
    setClearDialogOpen(false);
    window.location.reload();
  }

  function handleLanguageChange(code: string | null) {
    if (!code) return;
    i18n.changeLanguage(code);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        {t("settings.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.preferences")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Language */}
          <div className="flex items-center justify-between">
            <Label>{t("settings.language")}</Label>
            <Select
              value={i18n.language}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Base Currency */}
          <div className="flex items-center justify-between">
            <Label>{t("settings.baseCurrency")}</Label>
            <Select
              value={settings.baseCurrency}
              onValueChange={(v) => updateSetting("baseCurrency", v as string)}
            >
              <SelectTrigger className="w-28">
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

          <Separator />

          {/* Auto Refresh Interval */}
          <div className="flex items-center justify-between">
            <Label>{t("settings.autoRefresh")}</Label>
            <Select
              value={String(settings.refreshInterval)}
              onValueChange={(v) =>
                updateSetting("refreshInterval", Number(v))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{t("settings.refreshOff")}</SelectItem>
                <SelectItem value="5">{t("settings.refresh5min")}</SelectItem>
                <SelectItem value="15">{t("settings.refresh15min")}</SelectItem>
                <SelectItem value="30">{t("settings.refresh30min")}</SelectItem>
                <SelectItem value="60">{t("settings.refresh1hr")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Theme */}
          <div className="flex items-center justify-between">
            <Label>{t("settings.theme")}</Label>
            <Select
              value={settings.theme}
              onValueChange={(v) => handleThemeChange(v as string)}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">{t("settings.themeDark")}</SelectItem>
                <SelectItem value="light">{t("settings.themeLight")}</SelectItem>
                <SelectItem value="system">{t("settings.themeSystem")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Snapshot Time */}
          <div className="flex items-center justify-between">
            <Label htmlFor="snapshot-time">{t("settings.snapshotTime")}</Label>
            <Input
              id="snapshot-time"
              type="time"
              className="w-28"
              value={settings.snapshotTime}
              onChange={(e) => updateSetting("snapshotTime", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data & Market (polling) */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.data.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Poll interval */}
          <div className="flex items-center justify-between">
            <Label>{t("settings.data.pollInterval.label")}</Label>
            <Select
              value={String(settings.pollIntervalSec)}
              onValueChange={(v) => {
                const n = Number(v);
                if (n === 30 || n === 60 || n === 300) {
                  updateSetting("pollIntervalSec", n);
                }
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">
                  {t("settings.data.pollInterval.30s")}
                </SelectItem>
                <SelectItem value="60">
                  {t("settings.data.pollInterval.1min")}
                </SelectItem>
                <SelectItem value="300">
                  {t("settings.data.pollInterval.5min")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Poll only when market open */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label htmlFor="poll-only-market-open">
                {t("settings.data.pollOnlyMarketOpen.label")}
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("settings.data.pollOnlyMarketOpen.help")}
              </p>
            </div>
            <Switch
              id="poll-only-market-open"
              checked={settings.pollOnlyWhenMarketOpen}
              onCheckedChange={(checked) =>
                updateSetting("pollOnlyWhenMarketOpen", checked)
              }
            />
          </div>

          <Separator />

          {/* Intraday snapshot cadence (W2-04) */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label>{t("settings.data.snapshotInterval.label")}</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("settings.data.snapshotInterval.help")}
              </p>
            </div>
            <Select
              value={String(settings.snapshotIntervalMin)}
              onValueChange={(v) => {
                const n = Number(v);
                if (n === 5 || n === 15 || n === 30 || n === 60) {
                  updateSetting("snapshotIntervalMin", n);
                }
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">
                  {t("settings.data.snapshotInterval.5min")}
                </SelectItem>
                <SelectItem value="15">
                  {t("settings.data.snapshotInterval.15min")}
                </SelectItem>
                <SelectItem value="30">
                  {t("settings.data.snapshotInterval.30min")}
                </SelectItem>
                <SelectItem value="60">
                  {t("settings.data.snapshotInterval.1hr")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.dataManagement")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExportAll}>
              <Download className="size-3.5" data-icon="inline-start" />
              {t("settings.exportAll")}
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-3.5" data-icon="inline-start" />
              {t("settings.importData")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>

          <Separator />

          <div>
            <Button
              variant="destructive"
              onClick={() => setClearDialogOpen(true)}
            >
              <Trash2 className="size-3.5" data-icon="inline-start" />
              {t("settings.clearAll")}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("settings.clearWarning")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Clear confirmation dialog */}
      <Dialog
        open={clearDialogOpen}
        onOpenChange={(o) => !o && setClearDialogOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.clearConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("settings.clearConfirmMessage")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClearDialogOpen(false)}
            >
              {t("settings.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleClearAll}>
              {t("settings.deleteEverything")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
