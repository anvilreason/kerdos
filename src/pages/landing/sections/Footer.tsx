const productLinks = ['Features', 'Pricing', 'Desktop App', 'Pro', 'Changelog', 'Roadmap'];
const resourceLinks = ['Documentation', 'GitHub', 'Privacy Policy', 'Terms of Service', 'API Reference'];
const communityLinks = ['GitHub Discussions', 'Product Hunt', 'Reddit (r/FIRE)', 'Twitter/X'];

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--kerdos-text-primary)', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h4>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {links.map((link) => (
          <li key={link}>
            <a
              href="#"
              style={{
                fontSize: 14,
                color: '#888891',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#dcddde'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#888891'; }}
            >
              {link}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
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
            <p style={{ fontSize: 14, color: 'var(--kerdos-text-secondary)', margin: '0 0 12px', lineHeight: 1.6 }}>
              Track every asset you own. Runs entirely on your device.
            </p>
            <p style={{ fontSize: 13, color: 'var(--kerdos-text-secondary)', margin: '0 0 24px', fontStyle: 'italic' }}>
              &kappa;&#941;&rho;&delta;&omicron;&sigmaf; &mdash; Ancient Greek for &ldquo;gain&rdquo;
            </p>
            <p style={{ fontSize: 12, color: 'var(--kerdos-text-secondary)', margin: '0 0 4px', opacity: 0.7 }}>
              &copy; 2025 Kerdos
            </p>
            <p style={{ fontSize: 12, color: 'var(--kerdos-text-secondary)', margin: 0, opacity: 0.7 }}>
              MIT License
            </p>
          </div>

          {/* Link columns */}
          <FooterColumn title="Product" links={productLinks} />
          <FooterColumn title="Resources" links={resourceLinks} />
          <FooterColumn title="Community" links={communityLinks} />
        </div>
      </div>
    </footer>
  );
}
