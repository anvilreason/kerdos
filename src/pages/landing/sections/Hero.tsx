export default function Hero() {
  return (
    <section
      id="hero"
      style={{
        padding: '176px 24px 80px',
        background: 'var(--kerdos-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1200, width: '100%' }}>
        {/* Headline */}
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 800,
            lineHeight: 1.05,
            color: 'var(--kerdos-text-primary)',
            margin: '0 0 24px',
            letterSpacing: '-0.03em',
          }}
        >
          Know your{' '}
          <span style={{ color: 'var(--kerdos-accent)' }}>net worth</span>.
          <br />
          Own your data.
        </h1>

        {/* Subheadline */}
        <p
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            fontWeight: 400,
            color: 'var(--kerdos-text-secondary)',
            maxWidth: 640,
            margin: '0 auto 40px',
            lineHeight: 1.6,
          }}
        >
          The free, open-source net worth tracker that runs entirely on your device.
          <br />
          Real-time prices. No accounts. No cloud. No compromise.
        </p>

        {/* CTA block */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            flexWrap: 'wrap',
            marginBottom: 64,
          }}
        >
          <a
            href="#"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
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
            Download for macOS
          </a>
          <a
            href="#pricing"
            style={{
              fontSize: 14,
              color: '#888891',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#dcddde')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#888891')}
          >
            More platforms &darr;
          </a>
        </div>

        {/* Hero visual — dashboard mockup */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'relative',
            }}
          >
            {/* Glow behind card */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '120%',
                height: '120%',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(201, 151, 42, 0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
            {/* Dashboard Card */}
            <div
              style={{
                position: 'relative',
                background: '#1a1b1e',
                border: '1px solid var(--kerdos-border)',
                borderRadius: 16,
                padding: '0',
                minWidth: 380,
                maxWidth: 480,
                textAlign: 'left',
                animation: 'kerdos-float 4s ease-in-out infinite',
                overflow: 'hidden',
              }}
            >
              {/* Window frame with 3 dots */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--kerdos-border)',
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
              </div>

              {/* Content */}
              <div style={{ padding: '24px 28px 20px' }}>
                {/* Total Net Worth */}
                <p
                  style={{
                    margin: '0 0 4px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--kerdos-text-secondary)',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.06em',
                  }}
                >
                  Total Net Worth
                </p>
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: 36,
                    fontWeight: 700,
                    color: 'var(--kerdos-text-primary)',
                    fontFamily: 'var(--font-monospace)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  $847,230.89
                </p>
                {/* Daily change */}
                <p
                  style={{
                    margin: '0 0 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--color-gain)',
                  }}
                >
                  +$2,345.67 (+0.19%)
                </p>

                {/* Mini line chart */}
                <svg
                  viewBox="0 0 400 80"
                  style={{ width: '100%', height: 'auto', marginBottom: 20 }}
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <linearGradient id="heroChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--kerdos-accent)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--kerdos-accent)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points="0,65 30,60 60,55 90,58 120,50 150,48 180,42 210,45 240,38 270,35 300,30 330,28 360,22 390,18 400,16 400,80 0,80"
                    fill="url(#heroChartGrad)"
                  />
                  <polyline
                    points="0,65 30,60 60,55 90,58 120,50 150,48 180,42 210,45 240,38 270,35 300,30 330,28 360,22 390,18 400,16"
                    fill="none"
                    stroke="var(--kerdos-accent)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* Asset rows */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderTop: '1px solid var(--kerdos-border)',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--kerdos-text-primary)' }}>
                    AAPL &times;100
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--kerdos-text-primary)', fontFamily: 'var(--font-monospace)' }}>
                      $18,930
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-gain)' }}>+1.2%</span>
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderTop: '1px solid var(--kerdos-border)',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--kerdos-text-primary)' }}>
                    BTC &times;0.5
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--kerdos-text-primary)', fontFamily: 'var(--font-monospace)' }}>
                      $33,500
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-loss)' }}>-0.8%</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Caption */}
        <p
          style={{
            marginTop: 24,
            fontSize: 14,
            fontStyle: 'italic',
            color: 'var(--kerdos-text-secondary)',
          }}
        >
          All data stored locally on your device. Not even us can read it.
        </p>
      </div>

      {/* Float animation keyframes */}
      <style>{`
        @keyframes kerdos-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </section>
  );
}
