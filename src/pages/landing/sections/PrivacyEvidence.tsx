/**
 * PrivacyEvidence section (T-W4-03).
 *
 * A Notion-style three-card "evidence chain" explaining — concretely —
 * where Kerdos data lives, what leaves the device, and how the user can
 * verify both claims themselves.
 */
import { useTranslation } from "react-i18next";
import { useInView } from "@/utils/animations";

interface EvidenceCard {
  titleKey: string;
  titleFallback: string;
  bodyKey: string;
  bodyFallback: string;
  icon: React.ReactNode;
  linkLabelKey?: string;
  linkLabelFallback?: string;
  linkHref?: string;
}

// Inline SVGs keep us dependency-free and theme-able via `currentColor`.
const BrowserIcon = (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18" />
    <circle cx="6.5" cy="6.5" r="0.6" fill="currentColor" />
    <circle cx="9" cy="6.5" r="0.6" fill="currentColor" />
    <path d="M7 13h6" />
    <path d="M7 16h4" />
  </svg>
);

const CloudSlashIcon = (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M17 17H7a4 4 0 0 1-.88-7.9A5 5 0 0 1 15.3 8.4" />
    <path d="M3 3l18 18" />
  </svg>
);

const GitHubIcon = (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.09 3.29 9.4 7.86 10.92.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.87-1.54-3.87-1.54-.52-1.32-1.28-1.67-1.28-1.67-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.71 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18A11 11 0 0 1 12 6.84c.98 0 1.97.13 2.89.39 2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.44-2.7 5.41-5.27 5.7.41.35.78 1.05.78 2.12 0 1.53-.01 2.76-.01 3.14 0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
  </svg>
);

const CARDS: EvidenceCard[] = [
  {
    icon: BrowserIcon,
    titleKey: "landing.privacy.where.title",
    titleFallback: "Where your data lives",
    bodyKey: "landing.privacy.where.body",
    bodyFallback:
      "Stored in IndexedDB on your device. Open DevTools \u2192 Application \u2192 IndexedDB to see it yourself.",
  },
  {
    icon: CloudSlashIcon,
    titleKey: "landing.privacy.transmit.title",
    titleFallback: "What we receive",
    bodyKey: "landing.privacy.transmit.body",
    bodyFallback:
      "Nothing. We don't run servers that see your holdings. Market price requests go to public APIs only.",
  },
  {
    icon: GitHubIcon,
    titleKey: "landing.privacy.verify.title",
    titleFallback: "How you verify",
    bodyKey: "landing.privacy.verify.body",
    bodyFallback:
      "Open source. Audit the code yourself, or read the one-page privacy policy.",
    linkLabelKey: "landing.privacy.verify.link",
    linkLabelFallback: "Read the privacy policy \u2192",
    linkHref: "#/privacy",
  },
];

export default function PrivacyEvidence() {
  const { t } = useTranslation();
  const { ref, inView } = useInView(0.1);

  return (
    <section
      id="privacy-evidence"
      style={{
        padding: "120px 24px",
        background: "var(--kerdos-bg)",
      }}
    >
      <div
        ref={ref}
        style={{
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {/* Tag */}
        <span
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--kerdos-accent)",
            marginBottom: 14,
            textAlign: "center",
            opacity: inView ? 1 : 0,
            transition: "opacity 0.5s ease",
          }}
        >
          Privacy, Evidenced
        </span>

        <h2
          style={{
            fontSize: "clamp(2rem, 4vw, 2.75rem)",
            fontWeight: 700,
            color: "var(--kerdos-text-primary)",
            textAlign: "center",
            margin: "0 0 18px",
            lineHeight: 1.2,
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          {t(
            "landing.privacy.title",
            "Your data never leaves your device.",
          )}
        </h2>

        <p
          style={{
            fontSize: 16,
            fontWeight: 400,
            color: "var(--kerdos-text-secondary)",
            textAlign: "center",
            maxWidth: 620,
            margin: "0 auto 56px",
            lineHeight: 1.6,
            opacity: inView ? 1 : 0,
            transition: "opacity 0.6s ease 0.1s",
          }}
        >
          {t(
            "landing.privacy.subtitle",
            "Three ways to check, not just words on a page.",
          )}
        </p>

        {/* Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {CARDS.map((card, i) => (
            <div
              key={card.titleKey}
              style={{
                background: "var(--kerdos-surface)",
                border: "1px solid var(--kerdos-border)",
                borderRadius: 16,
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                opacity: inView ? 1 : 0,
                transform: inView
                  ? "translateY(0)"
                  : "translateY(20px)",
                transition: `opacity 0.6s ease ${0.15 + i * 0.1}s, transform 0.6s ease ${0.15 + i * 0.1}s`,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: "rgba(201,151,42,0.12)",
                  color: "var(--kerdos-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {card.icon}
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--kerdos-text-primary)",
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {t(card.titleKey, card.titleFallback)}
              </h3>
              <p
                style={{
                  fontSize: 14.5,
                  fontWeight: 400,
                  color: "var(--kerdos-text-secondary)",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {t(card.bodyKey, card.bodyFallback)}
              </p>
              {card.linkHref && card.linkLabelKey && card.linkLabelFallback && (
                <a
                  href={card.linkHref}
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--kerdos-accent)",
                    textDecoration: "none",
                    marginTop: "auto",
                    transition: "color 0.2s, text-decoration 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#e0ab35";
                    e.currentTarget.style.textDecoration = "underline";
                    e.currentTarget.style.textUnderlineOffset = "2px";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--kerdos-accent)";
                    e.currentTarget.style.textDecoration = "none";
                  }}
                >
                  {t(card.linkLabelKey, card.linkLabelFallback)}
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Footer note with GitHub link */}
        <p
          style={{
            textAlign: "center",
            marginTop: 36,
            fontSize: 13,
            color: "var(--kerdos-text-secondary)",
            opacity: inView ? 1 : 0,
            transition: "opacity 0.6s ease 0.5s",
          }}
        >
          {t("landing.privacy.githubPrefix", "Source on GitHub:")}{" "}
          <a
            href="https://github.com/kerdos"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--kerdos-accent)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            github.com/kerdos
          </a>
        </p>
      </div>
    </section>
  );
}
