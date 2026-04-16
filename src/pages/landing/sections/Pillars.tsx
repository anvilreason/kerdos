import { useInView } from '../../../utils/animations';

interface PillarData {
  icon: string;
  headline: string;
  body: string;
  cta?: { label: string; href: string };
}

const pillars: PillarData[] = [
  {
    icon: '\uD83D\uDD12',
    headline: 'Private by default.',
    body: 'Kerdos stores all your financial data locally on your device. No account required, no server sync, not even us can see it. Your wealth is yours.',
    cta: { label: 'Learn more about privacy \u2192', href: '#' },
  },
  {
    icon: '\uD83D\uDCCA',
    headline: 'Every asset, one view.',
    body: 'Stocks, crypto, gold, real estate, cash \u2014 Kerdos tracks everything. If you own it, Kerdos can value it. Real-time prices where available, manual entry where not.',
  },
  {
    icon: '\uD83D\uDDC4\uFE0F',
    headline: 'Your data survives.',
    body: 'Kerdos exports to open JSON and CSV formats. No proprietary lock-in. Your net worth history belongs to you, forever \u2014 even if we shut down tomorrow.',
    cta: { label: 'Download now \u2192', href: '#' },
  },
];

function PillarCard({ pillar, delay }: { pillar: PillarData; delay: number }) {
  const { ref, inView } = useInView(0.1);

  return (
    <div
      ref={ref}
      style={{
        background: 'var(--kerdos-surface)',
        border: '1px solid var(--kerdos-border)',
        borderRadius: 16,
        padding: '36px 32px',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 16,
      }}
    >
      <span style={{ fontSize: 36, lineHeight: 1 }}>{pillar.icon}</span>
      <h3
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--kerdos-text-primary)',
          margin: 0,
          lineHeight: 1.3,
        }}
      >
        {pillar.headline}
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
        {pillar.body}
      </p>
      {pillar.cta && (
        <a
          href={pillar.cta.href}
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#c9972a',
            textDecoration: 'none',
            marginTop: 4,
            transition: 'color 0.2s, text-decoration 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#e0ab35';
            e.currentTarget.style.textDecoration = 'underline';
            e.currentTarget.style.textUnderlineOffset = '2px';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#c9972a';
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          {pillar.cta.label}
        </a>
      )}
    </div>
  );
}

export default function Pillars() {
  return (
    <section
      id="pillars"
      style={{
        padding: '120px 24px',
        background: 'var(--kerdos-bg)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
        }}
      >
        {pillars.map((pillar, i) => (
          <PillarCard key={i} pillar={pillar} delay={i * 0.15} />
        ))}
      </div>
    </section>
  );
}
