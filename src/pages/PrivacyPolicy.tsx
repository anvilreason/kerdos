/**
 * PrivacyPolicy — one-page policy at `#/privacy` (T-W4-03).
 *
 * Kept intentionally simple and readable. Not marketing copy — the goal
 * is "a user can audit this in 90 seconds and know what's true".
 */
import { useTranslation } from "react-i18next";

const LAST_UPDATED = "2026-04-17";

export default function PrivacyPolicy() {
  const { t } = useTranslation();

  const h2: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 700,
    color: "var(--kerdos-text-primary)",
    margin: "36px 0 12px",
    lineHeight: 1.3,
  };
  const p: React.CSSProperties = {
    fontSize: 15,
    lineHeight: 1.7,
    color: "var(--kerdos-text-secondary)",
    margin: "0 0 10px",
  };
  const li: React.CSSProperties = {
    fontSize: 15,
    lineHeight: 1.7,
    color: "var(--kerdos-text-secondary)",
    marginBottom: 6,
  };

  return (
    <div
      style={{
        background: "#0d0d0d",
        color: "var(--kerdos-text-primary)",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "72px 24px 96px",
        }}
      >
        {/* Back link */}
        <a
          href="#/"
          style={{
            fontSize: 13,
            color: "var(--kerdos-text-secondary)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 24,
          }}
        >
          <span aria-hidden="true">{"\u2190"}</span>{" "}
          {t("privacy.back", "Back to home")}
        </a>

        <h1
          style={{
            fontSize: "clamp(2rem, 4vw, 2.75rem)",
            fontWeight: 800,
            color: "var(--kerdos-text-primary)",
            margin: "0 0 12px",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          {t("privacy.title", "Privacy Policy")}
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--kerdos-text-secondary)",
            margin: "0 0 16px",
          }}
        >
          {t("privacy.lastUpdated", "Last updated")}: {LAST_UPDATED}
        </p>

        <p style={p}>
          {t(
            "privacy.intro",
            "Kerdos is a local-first net-worth tracker. The short version: we don't run servers that store your financial data, and the only things that leave your device are anonymous price lookups to public market APIs.",
          )}
        </p>

        <h2 style={h2}>
          {t("privacy.collect.title", "1. What we collect")}
        </h2>
        <p style={p}>
          {t(
            "privacy.collect.body",
            "Nothing. Your assets, snapshots, and settings are stored in IndexedDB on your device. We have no account system, no analytics that tie to you, and no telemetry of your holdings.",
          )}
        </p>

        <h2 style={h2}>
          {t("privacy.transmit.title", "2. What we transmit")}
        </h2>
        <p style={p}>
          {t(
            "privacy.transmit.body",
            "When you hold assets that have live prices (stocks, crypto, gold, FX), Kerdos fetches quotes directly from public market APIs. These requests contain only the ticker symbols \u2014 never your quantities, cost basis, or net worth.",
          )}
        </p>
        <ul style={{ margin: "0 0 10px 20px", padding: 0 }}>
          <li style={li}>
            {t(
              "privacy.transmit.sources.stocks",
              "US stocks / ETFs \u2014 Yahoo Finance",
            )}
          </li>
          <li style={li}>
            {t("privacy.transmit.sources.crypto", "Crypto \u2014 CoinGecko")}
          </li>
          <li style={li}>
            {t(
              "privacy.transmit.sources.fx",
              "FX rates \u2014 ExchangeRate-API",
            )}
          </li>
          <li style={li}>
            {t("privacy.transmit.sources.gold", "Gold / metals \u2014 Metals.live")}
          </li>
        </ul>

        <h2 style={h2}>
          {t("privacy.rights.title", "3. Your rights")}
        </h2>
        <p style={p}>
          {t(
            "privacy.rights.body",
            "You can delete everything at any time by clearing the Kerdos IndexedDB in your browser (DevTools \u2192 Application \u2192 IndexedDB \u2192 WealthLensDB \u2192 delete) or by using Settings \u2192 Clear All Data inside the app. There is no server copy to request deletion for, because there is no server copy.",
          )}
        </p>

        <h2 style={h2}>
          {t("privacy.thirdParties.title", "4. Third parties")}
        </h2>
        <p style={p}>
          {t(
            "privacy.thirdParties.body",
            "The public market APIs listed above receive only ticker symbols. Their individual privacy terms govern what they log. Kerdos does not embed third-party analytics (no Google Analytics, no Mixpanel, no Segment) on the app itself.",
          )}
        </p>

        <h2 style={h2}>
          {t("privacy.openSource.title", "5. Open source")}
        </h2>
        <p style={p}>
          {t(
            "privacy.openSource.body",
            "The entire Kerdos codebase is open source under the MIT license. You can audit exactly what data leaves your device \u2014 or build your own version.",
          )}{" "}
          <a
            href="https://github.com/kerdos"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--kerdos-accent)", textDecoration: "none" }}
          >
            github.com/kerdos
          </a>
        </p>

        <h2 style={h2}>
          {t("privacy.contact.title", "6. Contact")}
        </h2>
        <p style={p}>
          {t(
            "privacy.contact.body",
            "Questions, concerns, or something we missed? Open an issue on GitHub. We'll answer publicly.",
          )}
        </p>
      </div>
    </div>
  );
}
