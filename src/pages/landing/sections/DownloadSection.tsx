/**
 * DownloadSection — wire up #download anchor the Navbar + Hero already
 * link to (previously a dead anchor). OS cards link directly to GitHub
 * Releases latest artefacts.
 *
 * The Apple Silicon (.dmg) ships today; Intel macOS, Windows (.msi) and
 * Linux (.AppImage) are gated on the GitHub Actions matrix workflow in
 * .github/workflows/release.yml and will be available once the first
 * tagged release lands.
 */
import { useTranslation } from "react-i18next";
import { Apple, Download, Monitor, Terminal } from "lucide-react";

const GH_REPO_OWNER = "anvilreason";
const GH_REPO_NAME = "kerdos";
const RELEASES_LATEST = `https://github.com/${GH_REPO_OWNER}/${GH_REPO_NAME}/releases/latest`;

/**
 * Direct download URLs follow Tauri's default artifact naming. GitHub's
 * /releases/latest/download/<name> shortcut always resolves to the most
 * recent tag — no need to hardcode versions.
 */
const downloadUrl = (filename: string): string =>
  `https://github.com/${GH_REPO_OWNER}/${GH_REPO_NAME}/releases/latest/download/${filename}`;

interface PlatformCard {
  id: "mac_arm" | "mac_intel" | "windows" | "linux";
  icon: React.ReactNode;
  titleKey: string;
  titleFallback: string;
  subtitleKey: string;
  subtitleFallback: string;
  href: string;
  available: boolean; // when false → renders disabled + "coming soon"
}

const PLATFORMS: PlatformCard[] = [
  {
    id: "mac_arm",
    icon: <Apple size={28} />,
    titleKey: "landing.download.macArm.title",
    titleFallback: "macOS (Apple Silicon)",
    subtitleKey: "landing.download.macArm.subtitle",
    subtitleFallback: ".dmg · M1/M2/M3/M4",
    href: downloadUrl("Kerdos_2.0.0_aarch64.dmg"),
    available: true,
  },
  {
    id: "mac_intel",
    icon: <Apple size={28} />,
    titleKey: "landing.download.macIntel.title",
    titleFallback: "macOS (Intel)",
    subtitleKey: "landing.download.macIntel.subtitle",
    subtitleFallback: ".dmg · x64",
    href: downloadUrl("Kerdos_2.0.0_x64.dmg"),
    available: false,
  },
  {
    id: "windows",
    icon: <Monitor size={28} />,
    titleKey: "landing.download.windows.title",
    titleFallback: "Windows",
    subtitleKey: "landing.download.windows.subtitle",
    subtitleFallback: ".msi · Windows 10+",
    href: downloadUrl("Kerdos_2.0.0_x64_en-US.msi"),
    available: false,
  },
  {
    id: "linux",
    icon: <Terminal size={28} />,
    titleKey: "landing.download.linux.title",
    titleFallback: "Linux",
    subtitleKey: "landing.download.linux.subtitle",
    subtitleFallback: ".AppImage · Any distro",
    href: downloadUrl("kerdos_2.0.0_amd64.AppImage"),
    available: false,
  },
];

export default function DownloadSection() {
  const { t } = useTranslation();

  return (
    <section
      id="download"
      style={{
        padding: "96px 24px",
        background: "var(--kerdos-bg)",
        borderTop: "1px solid var(--kerdos-border, #1e1e1e)",
      }}
    >
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p
            style={{
              fontSize: 13,
              color: "var(--kerdos-accent, #c9972a)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
              margin: "0 0 12px",
            }}
          >
            {t("landing.download.tag", "Download")}
          </p>
          <h2
            style={{
              fontSize: "clamp(1.875rem, 4vw, 2.75rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              color: "var(--kerdos-text-primary)",
              margin: "0 0 16px",
              letterSpacing: "-0.02em",
            }}
          >
            {t(
              "landing.download.title",
              "Run Kerdos natively on your machine.",
            )}
          </h2>
          <p
            style={{
              fontSize: "1.05rem",
              color: "var(--kerdos-text-secondary)",
              maxWidth: 620,
              margin: "0 auto",
              lineHeight: 1.65,
            }}
          >
            {t(
              "landing.download.subtitle",
              "Same app, offline-first, menu-bar friendly. Your data stays in a local SQLite file instead of the browser.",
            )}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {PLATFORMS.map((p) => (
            <PlatformTile key={p.id} {...p} />
          ))}
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "var(--kerdos-text-secondary)",
            marginTop: 24,
          }}
        >
          {t(
            "landing.download.sourceNote",
            "Prefer the source? Clone the repo or grab a tagged .tar.gz.",
          )}{" "}
          <a
            href={RELEASES_LATEST}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--kerdos-accent, #c9972a)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            {t("landing.download.allReleases", "All releases")} {"\u2192"}
          </a>
        </p>

        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "var(--kerdos-text-secondary)",
            marginTop: 14,
            opacity: 0.7,
          }}
        >
          {t(
            "landing.download.unsignedWarn",
            "Builds aren't code-signed yet. macOS may say \u201cdamaged / unverified\u201d — right-click the app and pick \u201cOpen\u201d to bypass Gatekeeper for now.",
          )}
        </p>
      </div>
    </section>
  );
}

function PlatformTile({
  icon,
  titleKey,
  titleFallback,
  subtitleKey,
  subtitleFallback,
  href,
  available,
}: PlatformCard) {
  const { t } = useTranslation();
  const tileStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 10,
    padding: "22px 22px 20px",
    borderRadius: 12,
    background: "var(--kerdos-card, #1a1b1e)",
    border: "1px solid var(--kerdos-border, #303033)",
    textDecoration: "none",
    transition: "border-color 0.2s, transform 0.2s, background 0.2s",
    cursor: available ? "pointer" : "not-allowed",
    opacity: available ? 1 : 0.55,
    color: "var(--kerdos-text-primary)",
  };

  const content = (
    <>
      <div
        style={{
          color: available
            ? "var(--kerdos-accent, #c9972a)"
            : "var(--kerdos-text-secondary)",
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>
        {t(titleKey, titleFallback)}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--kerdos-text-secondary)",
          fontFamily: "var(--font-monospace)",
        }}
      >
        {t(subtitleKey, subtitleFallback)}
      </div>
      <div style={{ flex: 1 }} />
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          fontWeight: 600,
          color: available
            ? "var(--kerdos-accent, #c9972a)"
            : "var(--kerdos-text-secondary)",
          marginTop: 8,
        }}
      >
        {available ? (
          <>
            <Download size={14} />
            {t("landing.download.cta", "Download")}
          </>
        ) : (
          t("landing.download.comingSoon", "Coming soon")
        )}
      </div>
    </>
  );

  if (!available) {
    return <div style={tileStyle}>{content}</div>;
  }
  return (
    <a
      href={href}
      style={tileStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--kerdos-accent, #c9972a)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor =
          "var(--kerdos-border, #303033)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {content}
    </a>
  );
}
