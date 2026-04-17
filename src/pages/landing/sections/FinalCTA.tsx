import { useTranslation } from 'react-i18next';
import { useInView } from '@/utils/animations';

export default function FinalCTA() {
  const { t } = useTranslation();
  const { ref, inView } = useInView(0.1);

  return (
    <section
      id="final-cta"
      style={{
        padding: '120px 24px',
        background: `radial-gradient(ellipse at 50% 50%, rgba(201,151,42,0.08) 0%, var(--kerdos-bg) 70%)`,
        color: 'var(--kerdos-text-primary)',
      }}
    >
      <div ref={ref} style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
        {/* Headline */}
        <h2
          style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 700,
            margin: '0 0 16px',
            lineHeight: 1.1,
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s, transform 0.6s',
          }}
        >
          {t('landing.finalCta.titleLine1', 'Track your wealth.')}
          <br />
          {t('landing.finalCta.titleLine2', 'Keep it private.')}
        </h2>

        {/* Subheadline */}
        <p
          style={{
            fontSize: 16,
            fontWeight: 400,
            color: 'var(--kerdos-text-secondary)',
            maxWidth: 560,
            margin: '0 auto 40px',
            lineHeight: 1.6,
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s 0.1s, transform 0.6s 0.1s',
          }}
        >
          {t(
            'landing.finalCta.subtitle',
            'Kerdos is free, open source, and runs entirely on your device. No account. No cloud. No compromise.',
          )}
        </p>

        {/* CTA buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 24,
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s 0.2s, transform 0.6s 0.2s',
          }}
        >
          <a
            href="#"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '16px 40px',
              borderRadius: 6,
              background: '#c9972a',
              color: '#0a0d12',
              fontSize: 17,
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
            {t('landing.finalCta.downloadBtn', 'Download for macOS')}
          </a>
          <a
            href="#"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '16px 40px',
              borderRadius: 6,
              background: 'transparent',
              color: 'var(--kerdos-text-primary)',
              fontSize: 17,
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid #303033',
              transition: 'background 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.borderColor = '#888891';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = '#303033';
            }}
          >
            {t('landing.finalCta.githubBtn', 'View on GitHub \u2197')}
          </a>
        </div>

        {/* Microcopy */}
        <p
          style={{
            fontSize: 13,
            color: 'var(--kerdos-text-secondary)',
            margin: '0 0 4px',
            opacity: inView ? 1 : 0,
            transition: 'opacity 0.6s 0.3s',
          }}
        >
          {t(
            'landing.finalCta.platforms',
            'macOS · Windows · Linux · Browser PWA',
          )}
        </p>
        <p
          style={{
            fontSize: 13,
            color: 'var(--kerdos-text-secondary)',
            margin: 0,
            opacity: inView ? 1 : 0,
            transition: 'opacity 0.6s 0.35s',
          }}
        >
          {t('landing.finalCta.license', 'MIT License · Open Source Forever')}
        </p>
      </div>
    </section>
  );
}
