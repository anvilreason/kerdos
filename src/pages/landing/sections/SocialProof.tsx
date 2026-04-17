import { useTranslation } from 'react-i18next';
import { useInView } from '@/utils/animations';

interface StatDef {
  icon: string;
  value: string;
  labelKey: string;
  labelFallback: string;
}

const stats: StatDef[] = [
  {
    icon: '\u2B50',
    value: '2,400+',
    labelKey: 'landing.social.stats.stars',
    labelFallback: 'GitHub stars',
  },
  {
    icon: '\uD83C\uDF74',
    value: '180+',
    labelKey: 'landing.social.stats.forks',
    labelFallback: 'Forks',
  },
  {
    icon: '\uD83D\uDCE5',
    value: '8,000+',
    labelKey: 'landing.social.stats.downloads',
    labelFallback: 'Downloads',
  },
  {
    icon: '\uD83C\uDFC6',
    value: '#3',
    labelKey: 'landing.social.stats.phLaunch',
    labelFallback: 'Product Hunt launch day',
  },
];

interface ReviewDef {
  quoteKey: string;
  quoteFallback: string;
  authorKey: string;
  authorFallback: string;
}

const reviews: ReviewDef[] = [
  {
    quoteKey: 'landing.social.reviews.mint.quote',
    quoteFallback:
      'Finally, a Mint replacement that doesn\u2019t require me to hand over my bank login. This is exactly what I\u2019ve been looking for since Mint shut down.',
    authorKey: 'landing.social.reviews.mint.author',
    authorFallback: '@pgfarmer, Hacker News',
  },
  {
    quoteKey: 'landing.social.reviews.multi.quote',
    quoteFallback:
      'I have assets in 4 countries across 3 currencies. Kerdos is the first tool that handles all of it, completely offline. The multi-currency conversion alone is worth it.',
    authorKey: 'landing.social.reviews.multi.author',
    authorFallback: '@crypto_nomad_88, Product Hunt',
  },
  {
    quoteKey: 'landing.social.reviews.fire.quote',
    quoteFallback:
      'The FIRE community has needed this. Open source, local-first, tracks everything \u2014 real estate included. And the dev is responsive on GitHub.',
    authorKey: 'landing.social.reviews.fire.author',
    authorFallback: '@retire_at_40, Reddit r/financialindependence',
  },
];

interface CommunityLink {
  key: string;
  fallback: string;
}

const communityLinks: CommunityLink[] = [
  { key: 'landing.social.links.github', fallback: 'GitHub' },
  { key: 'landing.social.links.ph', fallback: 'Product Hunt' },
  { key: 'landing.social.links.hn', fallback: 'Hacker News' },
  { key: 'landing.social.links.reddit', fallback: 'Reddit r/FIRE' },
];

export default function SocialProof() {
  const { t } = useTranslation();
  const { ref, inView } = useInView(0.1);

  return (
    <section
      id="social-proof"
      style={{
        padding: '120px 24px',
        background: 'var(--kerdos-bg)',
        color: 'var(--kerdos-text-primary)',
      }}
    >
      <div ref={ref} style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
        {/* Headline */}
        <h2
          style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 700,
            margin: '0 0 40px',
            lineHeight: 1.1,
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s, transform 0.6s',
          }}
        >
          {t('landing.social.title', 'Built in public. Used by builders.')}
        </h2>

        {/* Stats block — horizontal */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 48,
            flexWrap: 'wrap',
            marginBottom: 56,
            opacity: inView ? 1 : 0,
            transition: 'opacity 0.6s 0.1s',
          }}
        >
          {stats.map((stat) => (
            <div
              key={stat.labelKey}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span style={{ fontSize: 20 }}>{stat.icon}</span>
              <span
                style={{ fontSize: 20, fontWeight: 700, color: 'var(--kerdos-text-primary)' }}
              >
                {stat.value}
              </span>
              <span
                style={{
                  fontSize: 14,
                  color: 'var(--kerdos-text-secondary)',
                  fontWeight: 500,
                }}
              >
                {t(stat.labelKey, stat.labelFallback)}
              </span>
            </div>
          ))}
        </div>

        {/* Review cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
            marginBottom: 48,
          }}
        >
          {reviews.map((r, i) => (
            <div
              key={r.quoteKey}
              style={{
                background: 'var(--kerdos-surface)',
                border: '1px solid var(--kerdos-border)',
                borderRadius: 16,
                padding: '28px 24px',
                textAlign: 'left',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.5s ${0.2 + i * 0.1}s, transform 0.5s ${0.2 + i * 0.1}s`,
              }}
            >
              <p
                style={{
                  fontSize: 15,
                  fontStyle: 'italic',
                  color: 'var(--kerdos-text-primary)',
                  lineHeight: 1.6,
                  margin: '0 0 20px',
                }}
              >
                &ldquo;{t(r.quoteKey, r.quoteFallback)}&rdquo;
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--kerdos-text-secondary)',
                  margin: 0,
                  fontWeight: 500,
                }}
              >
                &mdash; {t(r.authorKey, r.authorFallback)}
              </p>
            </div>
          ))}
        </div>

        {/* Community links */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 32,
            flexWrap: 'wrap',
            opacity: inView ? 1 : 0,
            transition: 'opacity 0.6s 0.5s',
          }}
        >
          {communityLinks.map((link) => (
            <a
              key={link.key}
              href="#"
              style={{
                fontSize: 14,
                color: '#c9972a',
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'color 0.2s, gap 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#e0ab35';
                e.currentTarget.style.textDecoration = 'underline';
                e.currentTarget.style.textUnderlineOffset = '2px';
                e.currentTarget.style.gap = '7px';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#c9972a';
                e.currentTarget.style.textDecoration = 'none';
                e.currentTarget.style.gap = '4px';
              }}
            >
              {t(link.key, link.fallback)}
              <span>&rarr;</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
