import { useTranslation } from 'react-i18next';

interface FooterLinkDef {
  key: string;
  fallback: string;
}

const productLinks: FooterLinkDef[] = [
  { key: 'landing.footer.product.features', fallback: 'Features' },
  { key: 'landing.footer.product.pricing', fallback: 'Pricing' },
  { key: 'landing.footer.product.desktop', fallback: 'Desktop App' },
  { key: 'landing.footer.product.pro', fallback: 'Pro' },
  { key: 'landing.footer.product.changelog', fallback: 'Changelog' },
  { key: 'landing.footer.product.roadmap', fallback: 'Roadmap' },
];

const resourceLinks: FooterLinkDef[] = [
  { key: 'landing.footer.resources.docs', fallback: 'Documentation' },
  { key: 'landing.footer.resources.github', fallback: 'GitHub' },
  { key: 'landing.footer.resources.privacy', fallback: 'Privacy Policy' },
  { key: 'landing.footer.resources.terms', fallback: 'Terms of Service' },
  { key: 'landing.footer.resources.api', fallback: 'API Reference' },
];

const communityLinks: FooterLinkDef[] = [
  { key: 'landing.footer.community.discussions', fallback: 'GitHub Discussions' },
  { key: 'landing.footer.community.ph', fallback: 'Product Hunt' },
  { key: 'landing.footer.community.reddit', fallback: 'Reddit (r/FIRE)' },
  { key: 'landing.footer.community.twitter', fallback: 'Twitter/X' },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLinkDef[];
}) {
  const { t } = useTranslation();
  return (
    <div>
      <h4
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--kerdos-text-primary)',
          margin: '0 0 16px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {title}
      </h4>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {links.map((link) => (
          <li key={link.key}>
            <a
              href="#"
              style={{
                fontSize: 14,
                color: '#888891',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#dcddde';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#888891';
              }}
            >
              {t(link.key, link.fallback)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer
      id="footer"
      style={{
        padding: '0 24px 48px',
        background: 'var(--kerdos-bg)',
        color: 'var(--kerdos-text-primary)',
      }}
    >
      {/* Separator */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          borderTop: '1px solid var(--kerdos-border)',
          paddingTop: 64,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 48,
          }}
        >
          {/* Brand column */}
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, margin: '0 0 12px' }}>
              <span style={{ color: 'var(--kerdos-accent)' }}>&kappa;</span> Kerdos
            </p>
            <p
              style={{
                fontSize: 14,
                color: 'var(--kerdos-text-secondary)',
                margin: '0 0 12px',
                lineHeight: 1.6,
              }}
            >
              {t(
                'landing.footer.tagline',
                'Track every asset you own. Runs entirely on your device.',
              )}
            </p>
            <p
              style={{
                fontSize: 13,
                color: 'var(--kerdos-text-secondary)',
                margin: '0 0 24px',
                fontStyle: 'italic',
              }}
            >
              {t(
                'landing.footer.etymology',
                '\u03BA\u1F73\u03C1\u03B4\u03BF\u03C2 \u2014 Ancient Greek for \u201Cgain\u201D',
              )}
            </p>
            <p
              style={{
                fontSize: 12,
                color: 'var(--kerdos-text-secondary)',
                margin: '0 0 4px',
                opacity: 0.7,
              }}
            >
              {t('landing.footer.copyright', '\u00A9 2025 Kerdos')}
            </p>
            <p
              style={{
                fontSize: 12,
                color: 'var(--kerdos-text-secondary)',
                margin: 0,
                opacity: 0.7,
              }}
            >
              {t('landing.footer.licenseLine', 'MIT License')}
            </p>
          </div>

          {/* Link columns */}
          <FooterColumn
            title={t('landing.footer.columns.product', 'Product')}
            links={productLinks}
          />
          <FooterColumn
            title={t('landing.footer.columns.resources', 'Resources')}
            links={resourceLinks}
          />
          <FooterColumn
            title={t('landing.footer.columns.community', 'Community')}
            links={communityLinks}
          />
        </div>
      </div>
    </footer>
  );
}
