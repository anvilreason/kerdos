import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings, useUpdateSetting } from '@/stores/settingsStore';
import { scrollToAnchor } from '@/utils/scrollToAnchor';

interface RegionOption {
  code: string;
  flag: string;
  labelKey: string;  // i18n key; Navbar labels themselves are translated
  currency: string;
  lang: string;      // matching i18next language code
}

/**
 * Region presets. Each bundles a language + currency so a single pick
 * updates the whole app (i18n + settings.baseCurrency together).
 *
 * When user picks "EU", we stay on English because the other EU
 * locale files (de/fr/es/...) have limited coverage. Users wanting a
 * specific language can still override via Settings → Language.
 */
const REGIONS: RegionOption[] = [
  { code: 'us', flag: '🇺🇸', labelKey: 'nav.region.us', currency: 'USD', lang: 'en' },
  { code: 'cn', flag: '🇨🇳', labelKey: 'nav.region.cn', currency: 'CNY', lang: 'zh' },
  { code: 'hk', flag: '🇭🇰', labelKey: 'nav.region.hk', currency: 'HKD', lang: 'zh' },
  { code: 'jp', flag: '🇯🇵', labelKey: 'nav.region.jp', currency: 'JPY', lang: 'ja' },
  { code: 'gb', flag: '🇬🇧', labelKey: 'nav.region.gb', currency: 'GBP', lang: 'en' },
  { code: 'eu', flag: '🇪🇺', labelKey: 'nav.region.eu', currency: 'EUR', lang: 'en' },
];

/** Infer the best region from browser timezone + language. First-run only. */
function detectRegion(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'en';
  if (tz.includes('Asia/Shanghai') || tz.includes('Asia/Chongqing') || lang.startsWith('zh-CN')) return 'cn';
  if (tz.includes('Asia/Hong_Kong') || lang === 'zh-HK') return 'hk';
  if (tz.includes('Asia/Tokyo')) return 'jp';
  if (tz.includes('London')) return 'gb';
  if (tz.includes('Europe')) return 'eu';
  return 'us';
}

/**
 * Pick a region whose (lang, currency) pair matches current settings.
 * If nothing matches exactly, return null so callers fall back to detect.
 */
function regionFromState(lang: string, currency: string): RegionOption | null {
  return (
    REGIONS.find((r) => r.lang === lang && r.currency === currency) ??
    REGIONS.find((r) => r.currency === currency) ??
    null
  );
}

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const updateSetting = useUpdateSetting();

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const regionRef = useRef<HTMLDivElement>(null);

  // Derive active region from the *authoritative* state (i18n + settings).
  // If they don't match any preset, fall back to timezone detection (which
  // itself defaults to 'us'). This means: once the user picks a region,
  // Navbar reflects their choice everywhere, and Settings-page changes
  // sync here too.
  const selectedRegion =
    regionFromState(i18n.language, settings.baseCurrency)?.code ??
    detectRegion();

  // On first ever visit — if Dexie hasn't loaded yet, settings.baseCurrency
  // is still the 'USD' default. Auto-apply the detected region then, so a
  // Chinese user doesn't land on an English+USD page before touching
  // anything. Guarded by a ref so we only auto-apply once.
  const autoAppliedRef = useRef(false);
  useEffect(() => {
    if (autoAppliedRef.current) return;
    // Wait until settings have actually loaded from Dexie before deciding.
    // `useSettings` returns the default when `rows === undefined` (loading),
    // which we can't distinguish from "user has the default". We use a
    // one-shot timer: after 400ms, assume settings landed; if they still
    // look like the very first-run defaults (USD + en), apply detection.
    const timer = window.setTimeout(() => {
      autoAppliedRef.current = true;
      const langIsDefault = i18n.language === 'en' || i18n.language === 'en-US';
      const currencyIsDefault = settings.baseCurrency === 'USD';
      if (langIsDefault && currencyIsDefault) {
        const region = REGIONS.find((r) => r.code === detectRegion());
        if (region && region.code !== 'us') {
          void i18n.changeLanguage(region.lang);
          void updateSetting('baseCurrency', region.currency);
        }
      }
    }, 400);
    return () => window.clearTimeout(timer);
    // Run once on mount; deps intentionally empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll listener for navbar background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // IntersectionObserver for active link highlighting
  useEffect(() => {
    // TODO(W4): wire real section ids once Landing is rewritten (T-W4-03).
    // Current sections don't expose these ids yet; array kept minimal on purpose.
    const sectionIds = ['download', 'pricing'];
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(id);
            }
          });
        },
        { threshold: 0.3 }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // Click outside to close region dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (regionRef.current && !regionRef.current.contains(e.target as Node)) {
        setRegionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRegionSelect = useCallback(
    async (code: string) => {
      setRegionOpen(false);
      const region = REGIONS.find((r) => r.code === code);
      if (!region) return;
      // Apply language + currency atomically. Both are persisted:
      //   · i18next writes to localStorage via languageDetector
      //   · settings.baseCurrency writes to Dexie
      try {
        await i18n.changeLanguage(region.lang);
      } catch (err) {
        console.error('[Navbar] i18n.changeLanguage failed:', err);
      }
      try {
        await updateSetting('baseCurrency', region.currency);
      } catch (err) {
        console.error('[Navbar] updateSetting baseCurrency failed:', err);
      }
    },
    [i18n, updateSetting],
  );

  const currentRegion = REGIONS.find((r) => r.code === selectedRegion) || REGIONS[0];

  const navLinkStyle: React.CSSProperties = {
    color: '#888891',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 400,
    padding: '6px 10px',
    borderRadius: 4,
    transition: 'color 0.2s',
    position: 'relative',
    whiteSpace: 'nowrap',
  };

  const activeLinkColor = '#dcddde';

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: 56,
        background: scrolled ? 'rgba(13,13,13,0.88)' : '#0d0d0d',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        transition: 'background 0.3s, backdrop-filter 0.3s',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <a
          href="#"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            textDecoration: 'none',
            marginRight: 40,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              color: '#c9972a',
              fontSize: 20,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            &kappa;
          </span>
          <span
            style={{
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            Kerdos
          </span>
        </a>

        {/* Desktop nav links */}
        <div
          className="kerdos-nav-links"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flex: 1,
          }}
        >
          <a
            href="#download"
            onClick={scrollToAnchor('download')}
            style={{
              ...navLinkStyle,
              color: activeSection === 'download' ? activeLinkColor : '#888891',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#dcddde'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = activeSection === 'download' ? activeLinkColor : '#888891'; }}
          >
            {t('nav.landing.download', 'Download')}
          </a>
          <a
            href="#pricing"
            style={{
              ...navLinkStyle,
              color: activeSection === 'pricing' ? activeLinkColor : '#888891',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#dcddde'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = activeSection === 'pricing' ? activeLinkColor : '#888891'; }}
          >
            {t('nav.landing.pricing', 'Pricing')}
          </a>
          <a
            href="https://github.com/kerdos"
            target="_blank"
            rel="noopener noreferrer"
            style={navLinkStyle}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#dcddde'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#888891'; }}
          >
            {t('nav.landing.openSource', 'Open Source')}
          </a>
        </div>

        {/* Right side tools */}
        <div
          className="kerdos-nav-tools"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginLeft: 16,
          }}
        >
          {/* Region/Currency Picker */}
          <div ref={regionRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setRegionOpen(!regionOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                color: '#888891',
                fontSize: 14,
                fontWeight: 400,
                padding: '6px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#dcddde'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#888891'; }}
            >
              {/* Globe SVG */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              {currentRegion.currency}
              {/* Chevron */}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Region dropdown */}
            {regionOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  minWidth: 220,
                  background: '#1e1f22',
                  border: '1px solid #303033',
                  borderRadius: 8,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  padding: '8px 0',
                  zIndex: 1001,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    textTransform: 'uppercase',
                    color: '#5a5a60',
                    padding: '6px 12px 4px',
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                  }}
                >
                  {t('nav.region.header', 'Currency & Region')}
                </div>
                {REGIONS.map((r) => {
                  const isActive = r.code === selectedRegion;
                  return (
                    <button
                      key={r.code}
                      onClick={() => handleRegionSelect(r.code)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '7px 8px',
                        margin: '0 4px',
                        borderRadius: 5,
                        background: isActive ? 'rgba(201,151,42,0.12)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: isActive ? '#c9972a' : '#dcddde',
                        fontSize: 13,
                        textAlign: 'left',
                        transition: 'background 0.15s',
                        boxSizing: 'border-box',
                        // width calc to account for margin
                        maxWidth: 'calc(100% - 8px)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = '#2a2a2e';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{r.flag}</span>
                      <span style={{ flex: 1 }}>{t(r.labelKey)}</span>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 11,
                          color: isActive ? '#c9972a' : '#5a5a60',
                        }}
                      >
                        {r.currency}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <a
            href="https://community.kerdos.app"
            target="_blank"
            rel="noopener noreferrer"
            style={navLinkStyle}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#dcddde'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#888891'; }}
          >
            {t('nav.landing.community', 'Community')}
          </a>
          <a
            href="https://github.com/kerdos"
            target="_blank"
            rel="noopener noreferrer"
            style={navLinkStyle}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#dcddde'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#888891'; }}
          >
            {t('nav.landing.github', 'GitHub')}
          </a>

          {/* Try Demo — primary CTA in the Navbar (T-W4-01) */}
          <a
            href="#/demo"
            style={{
              marginLeft: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 6,
              background: '#c9972a',
              color: '#0a0d12',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'background 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#e0ab35'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#c9972a'; }}
          >
            {t('nav.landing.tryDemo', 'Try Demo')}
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          className="kerdos-mobile-hamburger"
          style={{
            display: 'none',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: menuOpen ? 0 : 4,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            width: 36,
            height: 36,
            position: 'relative',
          }}
        >
          <span
            style={{
              display: 'block',
              width: 18,
              height: 1.5,
              background: '#888891',
              borderRadius: 1,
              transition: 'transform 0.3s, opacity 0.3s',
              position: menuOpen ? 'absolute' : 'relative',
              transform: menuOpen ? 'rotate(45deg)' : 'none',
            }}
          />
          <span
            style={{
              display: 'block',
              width: 18,
              height: 1.5,
              background: '#888891',
              borderRadius: 1,
              transition: 'opacity 0.3s',
              opacity: menuOpen ? 0 : 1,
              position: menuOpen ? 'absolute' : 'relative',
            }}
          />
          <span
            style={{
              display: 'block',
              width: 18,
              height: 1.5,
              background: '#888891',
              borderRadius: 1,
              transition: 'transform 0.3s, opacity 0.3s',
              position: menuOpen ? 'absolute' : 'relative',
              transform: menuOpen ? 'rotate(-45deg)' : 'none',
            }}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="kerdos-mobile-menu"
          style={{
            display: 'none',
            flexDirection: 'column',
            gap: 4,
            padding: '12px 24px 24px',
            background: '#0d0d0d',
            borderTop: '1px solid #1e1e1e',
          }}
        >
          <a
            href="#/demo"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 14px',
              borderRadius: 6,
              background: '#c9972a',
              color: '#0a0d12',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              margin: '4px 0 8px',
              width: 'fit-content',
            }}
            onClick={() => setMenuOpen(false)}
          >
            {t('nav.landing.tryDemo', 'Try Demo')}
          </a>
          <a
            href="#download"
            style={{ ...navLinkStyle, display: 'block', padding: '10px 10px' }}
            onClick={(e) => {
              setMenuOpen(false);
              scrollToAnchor('download')(e);
            }}
          >
            {t('nav.landing.download', 'Download')}
          </a>
          <a href="#pricing" style={{ ...navLinkStyle, display: 'block', padding: '10px 10px' }} onClick={() => setMenuOpen(false)}>{t('nav.landing.pricing', 'Pricing')}</a>
          <a href="https://github.com/kerdos" target="_blank" rel="noopener noreferrer" style={{ ...navLinkStyle, display: 'block', padding: '10px 10px' }}>{t('nav.landing.openSource', 'Open Source')}</a>
          <div style={{ height: 1, background: '#1e1e1e', margin: '8px 0' }} />
          <a href="https://community.kerdos.app" target="_blank" rel="noopener noreferrer" style={{ ...navLinkStyle, display: 'block', padding: '10px 10px' }}>{t('nav.landing.community', 'Community')}</a>
          <a href="https://github.com/kerdos" target="_blank" rel="noopener noreferrer" style={{ ...navLinkStyle, display: 'block', padding: '10px 10px' }}>{t('nav.landing.github', 'GitHub')}</a>
        </div>
      )}

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .kerdos-nav-links { display: none !important; }
          .kerdos-nav-tools { display: none !important; }
          .kerdos-mobile-hamburger { display: flex !important; }
          .kerdos-mobile-menu { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
