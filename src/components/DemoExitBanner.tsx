/**
 * Top-of-app banner that appears while the DB is populated with demo
 * data. Clicking "Exit demo" wipes the demo rows and the banner hides
 * automatically via `useLiveQuery`.
 */
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { exitDemoMode, isInDemoMode } from "@/services/demoMode";

export default function DemoExitBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  // useLiveQuery will re-run whenever `assets` changes — that's how the
  // banner disappears automatically after `exitDemoMode` wipes the rows.
  const inDemo = useLiveQuery(() => isInDemoMode(), [], false);

  const handleExit = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await exitDemoMode();
      // After a demo exit the dashboard should land on the empty state.
      navigate("/app/", { replace: true });
    } catch (err) {
      // Error already logged inside exitDemoMode; surface nothing to
      // the UI besides unsticking the button.
      console.error("[DemoExitBanner] exit failed:", err);
    } finally {
      setBusy(false);
    }
  }, [busy, navigate]);

  if (!inDemo) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "10px 20px",
        background: "var(--kerdos-accent-soft, rgba(201,151,42,0.15))",
        borderBottom: "1px solid var(--kerdos-accent, #c9972a)",
        color: "var(--color-text-normal, #dcddde)",
        fontSize: 13,
        fontWeight: 500,
        flexWrap: "wrap",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span aria-hidden="true" style={{ fontSize: 14 }}>
          {"\u2728"}
        </span>
        {t(
          "demoMode.exitBanner.text",
          "You're exploring a demo portfolio. Data isn't real.",
        )}
      </span>
      <button
        type="button"
        onClick={handleExit}
        disabled={busy}
        style={{
          padding: "6px 14px",
          borderRadius: 6,
          border: "1px solid var(--kerdos-accent, #c9972a)",
          background: busy
            ? "rgba(201,151,42,0.35)"
            : "var(--kerdos-accent, #c9972a)",
          color: "#0a0d12",
          fontSize: 12,
          fontWeight: 600,
          cursor: busy ? "default" : "pointer",
          transition: "background 0.15s",
        }}
      >
        {t("demoMode.exitBanner.button", "Exit demo")}
      </button>
    </div>
  );
}
