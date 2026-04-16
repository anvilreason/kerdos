import { useInView } from '@/utils/animations';

const stats = [
  { icon: '\u2B50', value: '2,400+', label: 'GitHub stars' },
  { icon: '\uD83C\uDF74', value: '180+', label: 'Forks' },
  { icon: '\uD83D\uDCE5', value: '8,000+', label: 'Downloads' },
  { icon: '\uD83C\uDFC6', value: '#3', label: 'Product Hunt launch day' },
];

const reviews = [
  {
    quote: 'Finally, a Mint replacement that doesn\'t require me to hand over my bank login. This is exactly what I\'ve been looking for since Mint shut down.',
    author: '@pgfarmer, Hacker News',
  },
  {
    quote: 'I have assets in 4 countries across 3 currencies. Kerdos is the first tool that handles all of it, completely offline. The multi-currency conversion alone is worth it.',
    author: '@crypto_nomad_88, Product Hunt',
  },
  {
    quote: 'The FIRE community has needed this. Open source, local-first, tracks everything \u2014 real estate included. And the dev is responsive on GitHub.',
    author: '@retire_at_40, Reddit r/financialindependence',
  },
];

export default function SocialProof() {
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
          Built in public. Used by builders.
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
            <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{stat.icon}</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--kerdos-text-primary)' }}>{stat.value}</span>
              <span style={{ fontSize: 14, color: 'var(--kerdos-text-secondary)', fontWeight: 500 }}>{stat.label}</span>
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
              key={i}
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
                &ldquo;{r.quote}&rdquo;
              </p>
              <p style={{ fontSize: 13, color: 'var(--kerdos-text-secondary)', margin: 0, fontWeight: 500 }}>
                &mdash; {r.author}
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
          {['GitHub', 'Product Hunt', 'Hacker News', 'Reddit r/FIRE'].map((label) => (
            <a
              key={label}
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
              {label}<span>&rarr;</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
