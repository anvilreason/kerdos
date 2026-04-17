import { useTranslation } from 'react-i18next';
import { useInView } from '../../../utils/animations';

interface PillarData {
  icon: string;
  headlineKey: string;
  headlineFallback: string;
  bodyKey: string;
  bodyFallback: string;
  cta?: {
    labelKey: string;
    labelFallback: string;
    href: string;
  };
}

const pillars: PillarData[] = [
  {
    icon: '\uD83D\uDD12',
    headlineKey: 'landing.pillars.items.private.headline',
    headlineFallback: 'Private by default.',
    bodyKey: 'landing.pillars.items.private.body',
    bodyFallback:
      'Kerdos stores all your financial data locally on your device. No account required, no server sync, not even us can see it. Your wealth is yours.',
    cta: {
      labelKey: 'landing.pillars.items.private.cta',
      labelFallback: 'Learn more about privacy \u2192',
      href: '#',
    },
  },
  {
    icon: '\uD83D\uDCCA',
    headlineKey: 'landing.pillars.items.coverage.headline',
    headlineFallback: 'Every asset, one view.',
    bodyKey: 'landing.pillars.items.coverage.body',
    bodyFallback:
      'Stocks, crypto, gold, real estate, cash \u2014 Kerdos tracks everything. If you own it, Kerdos can value it. Real-time prices where available, manual entry where not.',
  },
  {
    icon: '\uD83D\uDDC4\uFE0F',
    headlineKey: 'landing.pillars.items.portability.headline',
    headlineFallback: 'Your data survives.',
    bodyKey: 'landing.pillars.items.portability.body',
    bodyFallback:
      'Kerdos exports to open JSON and CSV formats. No proprietary lock-in. Your net worth history belongs to you, forever \u2014 even if we shut down tomorrow.',
    cta: {
      labelKey: 'landing.pillars.items.portability.cta',
      labelFallback: 'Download now \u2192',
      href: '#',
    },
  },
];

function PillarCard({ pillar, delay }: { pillar: PillarData; delay: number }) {
  const { t } = useTranslation();
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
        {t(pillar.headlineKey, pillar.headlineFallback)}
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
        {t(pillar.bodyKey, pillar.bodyFallback)}
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
          {t(pillar.cta.labelKey, pillar.cta.labelFallback)}
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
          <PillarCard key={pillar.headlineKey} pillar={pillar} delay={i * 0.15} />
        ))}
      </div>
    </section>
  );
}
