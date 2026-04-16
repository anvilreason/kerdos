import { useInView } from '../../../utils/animations';
import DemoWindow from '../demo/DemoWindow';

const cards = [
  {
    icon: '\u26A1',
    headline: 'Live prices, always fresh',
    body: 'US stocks via Yahoo Finance, crypto via CoinGecko, gold via Metals.live \u2014 all updated automatically.',
  },
  {
    icon: '\uD83E\uDDEE',
    headline: 'Instant calculation',
    body: 'Add your holdings once. Kerdos multiplies quantity \u00D7 live price \u00D7 exchange rate and keeps your total current.',
  },
  {
    icon: '\uD83D\uDCF8',
    headline: 'Automatic history',
    body: 'Kerdos silently saves a daily snapshot of your net worth. Watch it compound over time without any effort.',
  },
];

function FeatureCard({ icon, headline, body, index }: { icon: string; headline: string; body: string; index: number }) {
  const { ref, inView } = useInView(0.15);
  return (
    <div
      ref={ref}
      style={{
        flex: '1 1 300px',
        background: 'var(--kerdos-surface)',
        border: '1px solid var(--kerdos-border)',
        borderRadius: 16,
        padding: '32px 28px',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s ease ${index * 150}ms, transform 0.6s ease ${index * 150}ms`,
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 16 }}>{icon}</div>
      <h3
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--kerdos-text-primary)',
          margin: '0 0 12px',
        }}
      >
        {headline}
      </h3>
      <p
        style={{
          fontSize: 16,
          fontWeight: 400,
          color: 'var(--kerdos-text-secondary)',
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        {body}
      </p>
    </div>
  );
}

export default function FeatureShowcase() {
  const { ref: sectionRef, inView: sectionInView } = useInView(0.1);

  return (
    <section
      id="feature-showcase"
      style={{
        background: '#0d0d0d',
        padding: '120px 0',
      }}
    >
      <div
        ref={sectionRef}
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
        }}
      >
        {/* Headline */}
        <h2
          style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 700,
            lineHeight: 1.15,
            color: 'var(--kerdos-text-primary)',
            textAlign: 'center',
            margin: '0 0 20px',
            opacity: sectionInView ? 1 : 0,
            transform: sectionInView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          From a single stock to a global portfolio,
          <br />
          Kerdos has you covered.
        </h2>

        {/* Subheadline */}
        <p
          style={{
            fontSize: 16,
            fontWeight: 400,
            color: 'var(--kerdos-text-secondary)',
            textAlign: 'center',
            maxWidth: 620,
            margin: '0 auto 40px',
            lineHeight: 1.6,
            opacity: sectionInView ? 1 : 0,
            transform: sectionInView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease 100ms, transform 0.6s ease 100ms',
          }}
        >
          Add your assets once. Watch your net worth update in real time &mdash; stocks, crypto, gold, forex, and anything you own manually.
        </p>

        {/* Context bar */}
        <div
          style={{
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--kerdos-text-secondary)',
            marginBottom: 24,
            opacity: sectionInView ? 1 : 0,
            transform: sectionInView ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.6s ease 200ms, transform 0.6s ease 200ms',
          }}
        >
          <span style={{ background: 'rgba(201,151,42,0.1)', border: '1px solid rgba(201,151,42,0.2)', borderRadius: 8, padding: '8px 16px', display: 'inline-block' }}>
            Live demo — NVDA, AAPL, BTC, ETH + Bay Area home + Tesla &nbsp;&middot;&nbsp; Prices shown in USD
          </span>
        </div>

        {/* THE DEMO */}
        <div
          style={{
            marginBottom: 24,
            opacity: sectionInView ? 1 : 0,
            transform: sectionInView ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s ease 300ms, transform 0.7s ease 300ms',
          }}
        >
          <DemoWindow />
        </div>

        {/* Caption */}
        <p
          style={{
            textAlign: 'center',
            fontSize: 13,
            fontWeight: 400,
            fontStyle: 'italic',
            color: 'var(--kerdos-text-secondary)',
            margin: '0 0 56px',
          }}
        >
          Prices simulate real market volatility — updated every 2.5 seconds. Click any asset to see details.
        </p>

        {/* Three Sub-Feature Cards */}
        <div
          style={{
            display: 'flex',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          {cards.map((card, i) => (
            <FeatureCard key={card.headline} icon={card.icon} headline={card.headline} body={card.body} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
