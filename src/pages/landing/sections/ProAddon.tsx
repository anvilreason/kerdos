import { useInView } from '@/utils/animations';

const features = [
  { icon: '\uD83D\uDDC4\uFE0F', title: 'SQLite Storage', desc: 'Persistent local database \u2014 survives browser clears and OS updates' },
  { icon: '\uD83D\uDD14', title: 'System Tray', desc: 'Live net worth in your menu bar. See it change without opening the app' },
  { icon: '\u23F0', title: 'Auto Refresh', desc: 'Prices refresh in the background on your schedule \u2014 5min, 15min, hourly' },
  { icon: '\uD83D\uDD14', title: 'Volatility Alerts', desc: 'Get a system notification when your net worth moves more than X%' },
  { icon: '\uD83D\uDCBE', title: 'Encrypted Backup', desc: 'AES-256 encrypted export to any local folder or external drive' },
  { icon: '\uD83D\uDCE6', title: 'Tiny Install', desc: 'Built with Tauri (Rust) \u2014 under 10MB. Electron apps are 150MB+' },
];

export default function ProAddon() {
  const { ref, inView } = useInView(0.1);

  return (
    <section
      id="pro-addon"
      style={{
        padding: '120px 24px',
        background: '#0e1219',
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
          Desktop App &middot; $25 one-time
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
          Take it beyond the browser.
        </h2>

        {/* Subheadline */}
        <p
          style={{
            fontSize: 16,
            fontWeight: 400,
            color: 'var(--kerdos-text-secondary)',
            textAlign: 'center',
            maxWidth: 680,
            margin: '0 auto 20px',
            lineHeight: 1.6,
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s 0.2s, transform 0.6s 0.2s',
          }}
        >
          The Kerdos desktop app (macOS + Windows) brings persistent SQLite storage, system tray live updates, and AES-encrypted local backups.
        </p>

        {/* Extra paragraph */}
        <p
          style={{
            fontSize: 15,
            fontWeight: 400,
            color: 'var(--kerdos-text-secondary)',
            textAlign: 'center',
            maxWidth: 680,
            margin: '0 auto 56px',
            lineHeight: 1.6,
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s 0.25s, transform 0.6s 0.25s',
          }}
        >
          The browser PWA is free and fully functional. But browsers can wipe IndexedDB when clearing data. The desktop app stores everything in a real SQLite file on disk &mdash; your data survives browser resets, app updates, and everything in between.
        </p>

        {/* Feature Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
            marginBottom: 56,
          }}
        >
          {features.map((f, i) => (
            <div
              key={f.title + i}
              style={{
                background: 'var(--kerdos-surface)',
                border: '1px solid var(--kerdos-border)',
                borderRadius: 16,
                padding: '28px 24px',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.5s ${0.15 + i * 0.08}s, transform 0.5s ${0.15 + i * 0.08}s`,
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px', color: 'var(--kerdos-text-primary)' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 14, fontWeight: 400, color: 'var(--kerdos-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <a
            href="#"
            style={{
              display: 'inline-block',
              padding: '14px 36px',
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
            Download Desktop App &mdash; $25
          </a>
          <p style={{ fontSize: 14, color: 'var(--kerdos-text-secondary)', marginTop: 12, fontWeight: 500 }}>
            One-time purchase &middot; No subscription
          </p>
          <p style={{ fontSize: 13, color: 'var(--kerdos-text-secondary)', marginTop: 4 }}>
            macOS 13+ &middot; Windows 10+ &middot; Linux coming soon
          </p>
        </div>
      </div>
    </section>
  );
}
