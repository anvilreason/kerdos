import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from '../../../utils/animations';

interface DataSource {
  icon: string;
  assetKey: string;
  assetFallback: string;
  source: string;
  intervalKey: string;
  intervalFallback: string;
}

const dataSources: DataSource[] = [
  {
    icon: '\uD83C\uDDFA\uD83C\uDDF8',
    assetKey: 'landing.priceHistory.sources.usStocks.asset',
    assetFallback: 'US Stocks / ETF',
    source: 'Yahoo Finance',
    intervalKey: 'landing.priceHistory.intervals.min15',
    intervalFallback: '15 min',
  },
  {
    icon: '\uD83C\uDDE8\uD83C\uDDF3',
    assetKey: 'landing.priceHistory.sources.aShares.asset',
    assetFallback: 'A-Shares',
    source: 'Sina Finance',
    intervalKey: 'landing.priceHistory.intervals.min15',
    intervalFallback: '15 min',
  },
  {
    icon: '\u20BF',
    assetKey: 'landing.priceHistory.sources.crypto.asset',
    assetFallback: 'Crypto',
    source: 'CoinGecko',
    intervalKey: 'landing.priceHistory.intervals.min5',
    intervalFallback: '5 min',
  },
  {
    icon: '\uD83D\uDCB1',
    assetKey: 'landing.priceHistory.sources.forex.asset',
    assetFallback: 'Forex',
    source: 'ExchangeRate-API',
    intervalKey: 'landing.priceHistory.intervals.hr1',
    intervalFallback: '1 hour',
  },
  {
    icon: '\uD83E\uDD47',
    assetKey: 'landing.priceHistory.sources.metals.asset',
    assetFallback: 'Gold / Silver',
    source: 'Metals.live',
    intervalKey: 'landing.priceHistory.intervals.min30',
    intervalFallback: '30 min',
  },
  {
    icon: '\uD83C\uDFE0',
    assetKey: 'landing.priceHistory.sources.realEstate.asset',
    assetFallback: 'Real Estate',
    source: 'Manual entry',
    intervalKey: 'landing.priceHistory.intervals.onUpdate',
    intervalFallback: 'On update',
  },
];

export default function PriceHistory() {
  const { t } = useTranslation();
  const { ref, inView } = useInView(0.1);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSourceIndex((prev) => (prev + 1) % 5);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="price-history"
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
        {/* Left side — text */}
        <div
          style={{
            flex: '1 1 440px',
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
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
            {t('landing.priceHistory.tag', 'Price Intelligence')}
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
            {t('landing.priceHistory.titleLine1', 'Five data sources.')}
            <br />
            {t('landing.priceHistory.titleLine2', 'One price feed.')}
          </h2>

          <p
            style={{
              fontSize: 16,
              fontWeight: 400,
              color: 'var(--kerdos-text-secondary)',
              lineHeight: 1.7,
              margin: '0 0 12px',
            }}
          >
            {t(
              'landing.priceHistory.body1',
              'Kerdos connects directly to free financial APIs from your browser — no intermediary server, no data leakage. Every price call goes from your device straight to the source.',
            )}
          </p>
          <p
            style={{
              fontSize: 16,
              fontWeight: 400,
              color: 'var(--kerdos-text-secondary)',
              lineHeight: 1.7,
              margin: '0 0 32px',
            }}
          >
            {t(
              'landing.priceHistory.body2',
              'When a source is unavailable, Kerdos falls back automatically. Prices stay fresh. Your net worth stays accurate.',
            )}
          </p>

          {/* Data source table */}
          <div
            style={{
              background: 'var(--kerdos-surface)',
              border: '1px solid var(--kerdos-border)',
              borderRadius: 12,
              overflow: 'hidden',
              marginBottom: 36,
            }}
          >
            {dataSources.map((ds, i) => {
              const isActive = i < 5 && i === activeSourceIndex;
              return (
                <div
                  key={ds.assetKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom:
                      i < dataSources.length - 1
                        ? '1px solid var(--kerdos-border)'
                        : 'none',
                    gap: 12,
                    background: isActive ? 'rgba(201,151,42,0.15)' : 'transparent',
                    borderColor: isActive ? '#c9972a' : undefined,
                    transition: 'background 0.3s, border-color 0.3s',
                  }}
                >
                  <span style={{ fontSize: 16, width: 24, textAlign: 'center' as const }}>
                    {ds.icon}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 14,
                      fontWeight: 600,
                      color: isActive ? '#c9972a' : 'var(--kerdos-text-primary)',
                      transition: 'color 0.3s',
                    }}
                  >
                    {t(ds.assetKey, ds.assetFallback)}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: isActive ? '#c9972a' : 'var(--kerdos-text-secondary)',
                      fontWeight: 500,
                      minWidth: 120,
                      transition: 'color 0.3s',
                    }}
                  >
                    {ds.source}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: isActive ? '#c9972a' : 'var(--kerdos-text-secondary)',
                      fontWeight: 500,
                      minWidth: 60,
                      textAlign: 'right' as const,
                      transition: 'color 0.3s',
                    }}
                  >
                    {t(ds.intervalKey, ds.intervalFallback)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <a
            href="#"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: '#c9972a',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'color 0.2s, gap 0.2s',
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
            {t('landing.priceHistory.cta', 'See how prices work \u2192')}
          </a>
        </div>

        {/* Right side — animated data flow diagram */}
        <div
          style={{
            flex: '1 1 440px',
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s ease 200ms, transform 0.7s ease 200ms',
          }}
        >
          <div
            style={{
              background: 'var(--kerdos-surface)',
              border: '1px solid var(--kerdos-border)',
              borderRadius: 16,
              padding: '36px 28px',
              position: 'relative',
            }}
          >
            <svg
              viewBox="0 0 400 320"
              style={{ width: '100%', height: 'auto' }}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Source boxes on the left */}
              {[
                { y: 20, label: 'Yahoo Finance', color: 'var(--color-us-stock)' },
                { y: 80, label: 'Sina Finance', color: 'var(--color-cn-stock)' },
                { y: 140, label: 'CoinGecko', color: 'var(--color-crypto)' },
                { y: 200, label: 'ExchangeRate', color: 'var(--color-forex)' },
                { y: 260, label: 'Metals.live', color: 'var(--color-gold)' },
              ].map((src, i) => {
                const isActive = i === activeSourceIndex;
                const fillColor = isActive ? '#c9972a' : src.color;
                return (
                  <g key={src.label}>
                    <rect
                      x="0"
                      y={src.y}
                      width="110"
                      height="36"
                      rx="8"
                      fill={fillColor}
                      fillOpacity={isActive ? 0.25 : 0.15}
                      stroke={fillColor}
                      strokeWidth={isActive ? 2 : 1}
                      style={{ transition: 'all 0.3s' }}
                    />
                    <text
                      x="55"
                      y={src.y + 22}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill={fillColor}
                      style={{ transition: 'fill 0.3s' }}
                    >
                      {src.label}
                    </text>
                    {/* Arrow line */}
                    <line
                      x1="115"
                      y1={src.y + 18}
                      x2="155"
                      y2={160}
                      stroke={src.color}
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      style={{
                        strokeDashoffset: inView ? 0 : 40,
                        transition: `stroke-dashoffset 1.5s ease ${0.3 + i * 0.15}s`,
                      }}
                    />
                  </g>
                );
              })}

              {/* Central Kerdos Engine box */}
              <rect
                x="155"
                y="130"
                width="100"
                height="60"
                rx="12"
                fill="var(--kerdos-accent)"
                fillOpacity="0.15"
                stroke="var(--kerdos-accent)"
                strokeWidth="1.5"
              />
              <text
                x="205"
                y="155"
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="var(--kerdos-accent)"
              >
                Kerdos
              </text>
              <text
                x="205"
                y="172"
                textAnchor="middle"
                fontSize="10"
                fontWeight="500"
                fill="var(--kerdos-text-secondary)"
              >
                {t('landing.priceHistory.engineLabel', 'Engine')}
              </text>

              {/* Arrow from engine to result */}
              <line
                x1="260"
                y1="160"
                x2="290"
                y2="160"
                stroke="var(--kerdos-accent)"
                strokeWidth="2"
                markerEnd="url(#arrowHead)"
              />

              {/* Arrow marker */}
              <defs>
                <marker
                  id="arrowHead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="var(--kerdos-accent)" />
                </marker>
              </defs>

              {/* Net Worth result box */}
              <rect
                x="295"
                y="125"
                width="100"
                height="70"
                rx="12"
                fill="var(--color-gain)"
                fillOpacity="0.1"
                stroke="var(--color-gain)"
                strokeWidth="1.5"
              />
              <text
                x="345"
                y="150"
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill="var(--color-gain)"
              >
                {t('landing.priceHistory.netWorthLabel', 'Net Worth')}
              </text>
              <text
                x="345"
                y="170"
                textAnchor="middle"
                fontSize="14"
                fontWeight="700"
                fill="var(--kerdos-text-primary)"
                fontFamily="var(--font-monospace)"
              >
                $847K
              </text>
              <text
                x="345"
                y="185"
                textAnchor="middle"
                fontSize="9"
                fontWeight="500"
                fill="var(--color-gain)"
              >
                +0.19%
              </text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
