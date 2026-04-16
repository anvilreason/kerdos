import { useInView } from '@/utils/animations';

const proFeatures = [
  { icon: '\uD83D\uDD10', title: 'Local AES-256 Encryption', desc: 'Set a master password. Your data is encrypted at rest on disk' },
  { icon: '\u2601\uFE0F', title: 'Device-to-cloud backup', desc: 'Direct backup to iCloud Drive or Google Drive. The file goes from your device to your cloud. Nothing touches our servers' },
  { icon: '\uD83D\uDCCA', title: 'Portfolio analytics', desc: 'IRR, XIRR, time-weighted return, benchmark comparison (vs S&P 500, BTC)' },
  { icon: '\uD83D\uDCC5', title: 'Extended history', desc: 'Unlimited snapshot history with CSV export' },
  { icon: '\uD83D\uDCF1', title: 'Mobile PWA', desc: 'Optimized iOS/Android experience with offline-first sync' },
  { icon: '\uD83D\uDC51', title: 'Priority support', desc: 'Response within 24 hours' },
];

export default function CreatorDashboard() {
  const { ref, inView } = useInView(0.1);

  return (
    <section
      id="creator-dashboard"
      style={{
        padding: '120px 24px',
        background: 'var(--kerdos-bg)',
        color: 'var(--kerdos-text-primary)',
      }}
    >
      <div ref={ref} style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Tag */}
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'uppercase',
            color: 'var(--kerdos-accent)',
            letterSpacing: '0.08em',
            marginBottom: 16,
            textAlign: 'center',
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s, transform 0.6s',
          }}
        >
          Pro &middot; $50/year
        </p>

        {/* Headline */}
        <h2
          style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 700,
            textAlign: 'center',
            margin: '0 0 16px',
            lineHeight: 1.1,
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s 0.1s, transform 0.6s 0.1s',
          }}
        >
          For serious investors.
        </h2>

        {/* Subheadline */}
        <p
          style={{
            fontSize: 16,
            fontWeight: 400,
            color: 'var(--kerdos-text-secondary)',
            textAlign: 'center',
            maxWidth: 680,
            margin: '0 auto 64px',
            lineHeight: 1.6,
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s 0.2s, transform 0.6s 0.2s',
          }}
        >
          Unlock AES encryption, cloud-to-device backup, and advanced portfolio analytics.
        </p>

        {/* 50/50 Split */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))',
            gap: 48,
            alignItems: 'center',
          }}
        >
          {/* Left: Feature list */}
          <div
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateX(0)' : 'translateX(-30px)',
              transition: 'opacity 0.6s 0.3s, transform 0.6s 0.3s',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {proFeatures.map((f) => (
                <div key={f.title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 24, lineHeight: 1 }}>{f.icon}</span>
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px', color: 'var(--kerdos-text-primary)' }}>
                      {f.title}
                    </h4>
                    <p style={{ fontSize: 14, color: 'var(--kerdos-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      {f.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 40, flexWrap: 'wrap' }}>
              <a
                href="#"
                style={{
                  display: 'inline-block',
                  padding: '14px 32px',
                  borderRadius: 6,
                  background: '#c9972a',
                  color: '#0a0d12',
                  fontSize: 16,
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e0ab35';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#c9972a';
                }}
              >
                Start 30-Day Free Trial
              </a>
              <span
                style={{
                  fontSize: 14,
                  color: 'var(--kerdos-text-secondary)',
                  fontWeight: 500,
                }}
              >
                No credit card required
              </span>
            </div>
          </div>

          {/* Right: Encrypted vault mockup */}
          <div
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateX(0)' : 'translateX(30px)',
              transition: 'opacity 0.6s 0.4s, transform 0.6s 0.4s',
            }}
          >
            <div
              style={{
                background: 'var(--kerdos-surface)',
                border: '1px solid var(--kerdos-border)',
                borderRadius: 16,
                padding: '32px 28px',
                textAlign: 'center',
              }}
            >
              {/* Lock icon */}
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(201, 151, 42, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  fontSize: 32,
                }}
              >
                {'\uD83D\uDD10'}
              </div>

              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--kerdos-text-primary)', margin: '0 0 8px' }}>
                Vault encrypted
              </p>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--kerdos-accent)', margin: '0 0 24px' }}>
                AES-256
              </p>

              {/* Vault details */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 10,
                  padding: '16px',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--kerdos-text-secondary)' }}>Status</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-gain)' }}>Encrypted</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--kerdos-text-secondary)' }}>Last backup</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--kerdos-text-primary)' }}>2 hours ago</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--kerdos-text-secondary)' }}>Destination</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--kerdos-text-primary)' }}>iCloud Drive</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
