import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from '../../../utils/animations';

interface RegionalAsset {
  label: string;
  value: string;
  badge: string;
}

const regionalAssets: Record<string, RegionalAsset> = {
  us: {
    label: 'Bay Area Home',
    value: '$1,850,000',
    badge: '\u26A0\uFE0F Manual \u00B7 Last updated 14 days ago',
  },
  cn: {
    label: '\u4E0A\u6D77\u4E8C\u73AF\u623F\u4EA7',
    value: '\u00A58,500,000',
    badge: '\u26A0\uFE0F \u624B\u52A8 \u00B7 \u4E0A\u6B21\u66F4\u65B0 14 \u5929\u524D',
  },
  eu: {
    label: 'Munich Apartment',
    value: '\u20AC650,000',
    badge: '\u26A0\uFE0F Manual \u00B7 Last updated 14 days ago',
  },
  gb: {
    label: 'London Flat',
    value: '\u00A3520,000',
    badge: '\u26A0\uFE0F Manual \u00B7 Last updated 14 days ago',
  },
  jp: {
    label: '\u6771\u4EAC\u30DE\u30F3\u30B7\u30E7\u30F3',
    value: '\u00A575,000,000',
    badge: '\u26A0\uFE0F \u624B\u52D5 \u00B7 \u6700\u7D42\u66F4\u65B0 14 \u65E5\u524D',
  },
  hk: {
    label: '\u9999\u6E2F\u4F4F\u5B85',
    value: 'HK$8,000,000',
    badge: '\u26A0\uFE0F \u624B\u52D5 \u00B7 \u4E0A\u6B21\u66F4\u65B0 14 \u5929\u524D',
  },
};

interface AssetTypeDef {
  icon: string;
  labelKey: string;
  labelFallback: string;
  color: string;
}

const assetTypes: AssetTypeDef[] = [
  {
    icon: '\uD83D\uDCC8',
    labelKey: 'landing.coverage.types.usStocks',
    labelFallback: 'US Stocks',
    color: 'var(--color-us-stock)',
  },
  {
    icon: '\uD83C\uDC04',
    labelKey: 'landing.coverage.types.aShares',
    labelFallback: 'A-Shares',
    color: 'var(--color-cn-stock)',
  },
  {
    icon: '\uD83D\uDCE6',
    labelKey: 'landing.coverage.types.etf',
    labelFallback: 'ETF',
    color: 'var(--color-etf)',
  },
  {
    icon: '\u20BF',
    labelKey: 'landing.coverage.types.crypto',
    labelFallback: 'Crypto',
    color: 'var(--color-crypto)',
  },
  {
    icon: '\uD83E\uDD47',
    labelKey: 'landing.coverage.types.gold',
    labelFallback: 'Gold',
    color: 'var(--color-gold)',
  },
  {
    icon: '\uD83D\uDCB1',
    labelKey: 'landing.coverage.types.forex',
    labelFallback: 'Forex',
    color: 'var(--color-forex)',
  },
  {
    icon: '\uD83C\uDFE0',
    labelKey: 'landing.coverage.types.realEstate',
    labelFallback: 'Real Estate',
    color: 'var(--color-real-estate)',
  },
  {
    icon: '\uD83D\uDE97',
    labelKey: 'landing.coverage.types.vehicle',
    labelFallback: 'Vehicle',
    color: 'var(--color-vehicle)',
  },
  {
    icon: '\uD83D\uDCB5',
    labelKey: 'landing.coverage.types.cash',
    labelFallback: 'Cash',
    color: 'var(--color-cash)',
  },
  {
    icon: '\u25EF',
    labelKey: 'landing.coverage.types.other',
    labelFallback: 'Other',
    color: 'var(--color-other)',
  },
];

interface StatDef {
  icon: string;
  value: string;
  labelKey: string;
  labelFallback: string;
}

const stats: StatDef[] = [
  {
    icon: '\uD83D\uDCCA',
    value: '10',
    labelKey: 'landing.coverage.stats.types',
    labelFallback: 'asset types \u2014 fully supported',
  },
  {
    icon: '\uD83D\uDCB1',
    value: '50+',
    labelKey: 'landing.coverage.stats.currencies',
    labelFallback: 'currencies \u2014 auto-converted to base',
  },
  {
    icon: '\u26A1',
    value: '5',
    labelKey: 'landing.coverage.stats.sources',
    labelFallback: 'price sources \u2014 all free, no API key needed',
  },
  {
    icon: '\uD83D\uDD12',
    value: '0 bytes',
    labelKey: 'landing.coverage.stats.uploaded',
    labelFallback: 'uploaded \u2014 to any server, ever',
  },
];

function AssetTile({
  icon,
  label,
  color,
  index,
}: {
  icon: string;
  label: string;
  color: string;
  index: number;
}) {
  const { ref, inView } = useInView(0.1);
  return (
    <div
      ref={ref}
      style={{
        background: 'var(--kerdos-surface)',
        border: '1px solid var(--kerdos-border)',
        borderRadius: 12,
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--kerdos-text-primary)',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.95)',
        transition: `opacity 0.5s ease ${index * 80}ms, transform 0.5s ease ${index * 80}ms`,
      }}
    >
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span>{label}</span>
      <span
        style={{
          width: 24,
          height: 3,
          borderRadius: 2,
          background: color,
          opacity: 0.6,
        }}
      />
    </div>
  );
}

function detectDefaultRegion(): string {
  try {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('zh-hk') || lang.startsWith('zh-tw')) return 'hk';
    if (lang.startsWith('zh')) return 'cn';
    if (lang.startsWith('ja')) return 'jp';
    if (lang.startsWith('en-gb')) return 'gb';
    if (
      lang.startsWith('de') ||
      lang.startsWith('fr') ||
      lang.startsWith('es') ||
      lang.startsWith('it')
    )
      return 'eu';
  } catch {
    /* ignore */
  }
  return 'us';
}

export default function UniversalCoverage() {
  const { t } = useTranslation();
  const { ref, inView } = useInView(0.1);
  const [region, setRegion] = useState<string>(detectDefaultRegion);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ region: string }>;
      if (customEvent.detail?.region) {
        setRegion(customEvent.detail.region);
      }
    };
    window.addEventListener('kerdos-region-change', handler);
    return () => window.removeEventListener('kerdos-region-change', handler);
  }, []);

  const asset = regionalAssets[region] || regionalAssets.us;

  return (
    <section
      id="universal-coverage"
      style={{
        padding: '120px 24px',
        background: 'var(--kerdos-bg)',
      }}
    >
      <div
        ref={ref}
        style={{
          maxWidth: 1200,
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 64,
          flexWrap: 'wrap',
        }}
      >
        {/* Left side — asset type grid + manual asset sample */}
        <div style={{ flex: '1 1 440px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 12,
              marginBottom: 24,
            }}
          >
            {assetTypes.map((at, i) => (
              <AssetTile
                key={at.labelKey}
                icon={at.icon}
                label={t(at.labelKey, at.labelFallback)}
                color={at.color}
                index={i}
              />
            ))}
          </div>

          {/* Manual asset sample row */}
          <div
            style={{
              background: 'var(--kerdos-surface)',
              border: '1px solid var(--kerdos-border)',
              borderRadius: 12,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(12px)',
              transition: 'opacity 0.6s ease 0.8s, transform 0.6s ease 0.8s',
            }}
          >
            <span style={{ fontSize: 18 }}>{'\uD83C\uDFE0'}</span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--kerdos-text-primary)',
              }}
            >
              {asset.label}
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--kerdos-text-primary)',
                fontFamily: 'var(--font-monospace)',
              }}
            >
              {asset.value}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--color-stale)',
                background: 'var(--color-manual-bg)',
                padding: '2px 8px',
                borderRadius: 6,
              }}
            >
              {asset.badge}
            </span>
          </div>
        </div>

        {/* Right side — text */}
        <div
          style={{
            flex: '1 1 440px',
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.6s ease 200ms, transform 0.6s ease 200ms',
          }}
        >
          {/* Tag */}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'uppercase' as const,
              color: 'var(--kerdos-accent)',
              letterSpacing: '0.08em',
              marginBottom: 16,
              display: 'block',
            }}
          >
            {t('landing.coverage.tag', 'Universal Coverage')}
          </span>

          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 700,
              lineHeight: 1.15,
              color: 'var(--kerdos-text-primary)',
              margin: '0 0 24px',
            }}
          >
            {t('landing.coverage.titleLine1', 'Financial assets.')}
            <br />
            {t('landing.coverage.titleLine2', 'Physical assets.')}
            <br />
            {t('landing.coverage.titleLine3', 'Everything.')}
          </h2>

          <p
            style={{
              fontSize: 16,
              fontWeight: 400,
              color: 'var(--kerdos-text-secondary)',
              lineHeight: 1.7,
              margin: '0 0 16px',
            }}
          >
            {t(
              'landing.coverage.body1',
              'Most net worth tools only track what they can see via bank APIs. Kerdos is different — you enter what you own, and we value it. Your Shanghai apartment, your gold coins, your BTC cold wallet: all in one number.',
            )}
          </p>
          <p
            style={{
              fontSize: 16,
              fontWeight: 400,
              color: 'var(--kerdos-text-secondary)',
              lineHeight: 1.7,
              margin: '0 0 36px',
            }}
          >
            {t(
              'landing.coverage.body2',
              'For assets without live prices — real estate, vehicles, art — Kerdos lets you manually set a value. We\u2019ll remind you when it\u2019s getting stale, so your net worth stays honest.',
            )}
          </p>

          {/* Stats grid 2x2 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 24,
            }}
          >
            {stats.map((stat) => (
              <div key={stat.labelKey}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>{stat.icon}</span>
                  <span
                    style={{
                      fontSize: '2rem',
                      fontWeight: 700,
                      color: 'var(--kerdos-text-primary)',
                      lineHeight: 1.2,
                    }}
                  >
                    {stat.value}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 400,
                    color: 'var(--kerdos-text-secondary)',
                  }}
                >
                  {t(stat.labelKey, stat.labelFallback)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
