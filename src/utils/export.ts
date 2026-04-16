import type { Asset } from "../types/asset";
import type { Snapshot } from "../types/snapshot";

/**
 * Export snapshots as a CSV string.
 */
export function exportToCSV(snapshots: Snapshot[]): string {
  const header = "Date,Total Net Worth,Currency";
  const rows = snapshots.map(
    (s) => `${s.date},${s.totalNetWorth.toFixed(2)},${s.currency}`,
  );
  return [header, ...rows].join("\n");
}

/**
 * Export full data as a JSON string.
 */
export function exportToJSON(data: {
  assets: Asset[];
  snapshots: Snapshot[];
}): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Import from a JSON string -- returns parsed data.
 * Throws if the JSON is invalid or missing required fields.
 */
export function parseImportJSON(json: string): {
  assets: Asset[];
  snapshots: Snapshot[];
} {
  const parsed = JSON.parse(json);

  if (!Array.isArray(parsed.assets)) {
    throw new Error('Invalid import: missing "assets" array');
  }
  if (!Array.isArray(parsed.snapshots)) {
    throw new Error('Invalid import: missing "snapshots" array');
  }

  return {
    assets: parsed.assets as Asset[],
    snapshots: parsed.snapshots as Snapshot[],
  };
}

/**
 * Trigger a browser download of a file.
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
