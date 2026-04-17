/**
 * Resolve an asset's display name through i18n.
 *
 * Demo-mode assets have stable ids (`demo-aapl`, `demo-re-cn`, ...) and
 * we keep a translation key for each in i18n under `demo.assets.*`. Real
 * user assets keep their free-form `name` unchanged — users type their
 * own names and expect them back verbatim, i18n shouldn't touch those.
 */
import type { Asset } from "@/types/asset";
import type { TFunction } from "i18next";

/**
 * Stable demo-asset-id → i18n key. Every id here MUST exist in
 * demo-portfolio.ts and `demo.assets.<key>` MUST exist in both en.json
 * and zh.json. Missing entries degrade to the raw `asset.name`.
 */
const DEMO_ID_TO_KEY: Record<string, string> = {
  "demo-aapl": "demo.assets.aapl",
  "demo-msft": "demo.assets.msft",
  "demo-nvda": "demo.assets.nvda",
  "demo-googl": "demo.assets.googl",
  "demo-brk-b": "demo.assets.brkB",
  "demo-600519": "demo.assets.moutai",
  "demo-000858": "demo.assets.wuliangye",
  "demo-300750": "demo.assets.catl",
  "demo-btc": "demo.assets.btc",
  "demo-eth": "demo.assets.eth",
  "demo-cash-cny": "demo.assets.cashCny",
  "demo-cash-usd": "demo.assets.cashUsd",
  "demo-cash-hkd": "demo.assets.cashHkd",
  "demo-cash-jpy": "demo.assets.cashJpy",
  "demo-cash-eur": "demo.assets.cashEur",
  "demo-re-cn": "demo.assets.realEstateCn",
  "demo-re-us": "demo.assets.realEstateUs",
  "demo-xauusd": "demo.assets.gold",
  "demo-510300": "demo.assets.csi300Etf",
  "demo-spy": "demo.assets.spy",
};

export function getAssetDisplayName(asset: Asset, t: TFunction): string {
  const key = DEMO_ID_TO_KEY[asset.id];
  if (!key) return asset.name;
  // t(key, fallback) returns fallback if key missing in loaded locale.
  return t(key, asset.name);
}

/**
 * Alternate: just look up by id (useful when you only have the id in
 * hand, e.g. in a snapshot breakdown row).
 */
export function getAssetDisplayNameById(
  id: string,
  fallback: string,
  t: TFunction,
): string {
  const key = DEMO_ID_TO_KEY[id];
  if (!key) return fallback;
  return t(key, fallback);
}
