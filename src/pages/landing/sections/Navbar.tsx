import { useState, useEffect, useCallback, useRef } from 'react';

interface RegionOption {
  code: string;
  flag: string;
  label: string;
  currency: string;
}

const REGIONS: RegionOption[] = [
  { code: 'us', flag: '🇺🇸', label: 'United States', currency: 'USD' },
  { code: 'cn', flag: '🇨🇳', label: '中国大陆', currency: 'CNY' },
  { code: 'eu', flag: '🇪🇺', label: 'Europe', currency: 'EUR' },
  { code: 'gb', flag: '🇬🇧', label: 'United Kingdom', currency: 'GBP' },
  { code: 'jp', flag: '🇯🇵', label: '日本', currency: 'JPY' },
  { code: 'hk', flag: '🇭🇰', label: '香港', currency: 'HKD' },
];

function detectRegion(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang = navigator.language;
  if (tz.includes('Asia/Shanghai') || tz.includes('Asia/Chongqing') || lang.startsWith('zh-CN')) return 'cn';
  if (tz.includes('Asia/Hong_Kong') || lang === 'zh-HK') return 'hk';
  if (tz.includes('Asia/Tokyo')) return 'jp';
  if (tz.includes('Europe')) return 'eu';
  if (tz.includes('London')) return 'gb';
  return 'us';
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('us');
  const [activeSection, setActiveSection] = useState('');
  const regionRef = useRef<HTMLDivElement>(null);

  // Auto-detect region on mount
  useEffect(() => {
    const detected = detectRegion();
    setSelectedRegion(detected);
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
    const sectionIds = ['download', 'pricing', 'sync', 'enterprise'];
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

  const handleRegionSelect = useCallback((code: string) => {
    setSelectedRegion(code);
    setRegionOpen(false);
    const region = REGIONS.find((r) => r.code === code);
    if (region) {
      window.dispatchEvent(
        new CustomEvent('kerdos-region-change', {
          detail: { currency: region.currency, region: region.code },
        })
      );
    }
  }, []);

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
            style={{
              ...navLinkStyle,
              color: activeSection === 'download' ? activeLinkColor : '#888891',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#dcddde'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = activeSection === 'download' ? activeLinkColor : '#888891'; }}
          >
            Download
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
            Pricing
          </a>
          {/* Sync link with "Soon" badge and tooltip */}
          <a
            href="#sync"
            className="kerdos-sync-link"
            style={{
              ...navLinkStyle,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: activeSection === 'sync' ? activeLinkColor : '#888891',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#dcddde'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = activeSection === 'sync' ? activeLinkColor : '#888891'; }}
          >
            Sync
            <span
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                background: 'rgba(201,151,42,0.15)',
                color: '#c9972a',
                padding: '1px 5px',
                borderRadius: 3,
                fontWeight: 600,
                lineHeight: '16px',
              }}
            >
              Soon
            </span>
          </a>
          <a
            href="https://github.com/kerdos"
            target="_blank"
            rel="noopener noreferrer"
            style={navLinkStyle}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#dcddde'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#888891'; }}
          >
            Open Source
          </a>
          <a
            href="#enterprise"
            style={{
              ...navLinkStyle,
              color: activeSection === 'enterprise' ? activeLinkColor : '#888891',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#dcddde'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = activeSection === 'enterprise' ? activeLinkColor : '#888891'; }}
          >
            Enterprise
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
                  Currency &amp; Region
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
                      <span style={{ flex: 1 }}>{r.label}</span>
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
            Community
          </a>
          <a
            href="https://github.com/kerdos"
            target="_blank"
            rel="noopener noreferrer"
            style={navLinkStyle}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#dcddde'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#888891'; }}
          >
            GitHub
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
          <a href="#download" style={{ ...navLinkStyle, display: 'block', padding: '10px 10px' }} onClick={() => setMenuOpen(false)}>Download</a>
          <a href="#pricing" style={{ ...navLinkStyle, display: 'block', padding: '10px 10px' }} onClick={() => setMenuOpen(false)}>Pricing</a>
          <a href="#sync" style={{ ...navLinkStyle, display: 'flex', alignItems: 'center', gap: 6, padding: '10px 10px' }} onClick={() => setMenuOpen(false)}>
            Sync
            <span style={{ fontSize: 10, textTransform: 'uppercase', background: 'rgba(201,151,42,0.15)', color: '#c9972a', padding: '1px 5px', borderRadius: 3, fontWeight: 600 }}>Soon</span>
          </a>
          <a href="https://github.com/kerdos" target="_blank" rel="noopener noreferrer" style={{ ...navLinkStyle, display: 'block', padding: '10px 10px' }}>Open Source</a>
          <a href="#enterprise" style={{ ...navLinkStyle, display: 'block', padding: '10px 10px' }} onClick={() => setMenuOpen(false)}>Enterprise</a>
          <div style={{ height: 1, background: '#1e1e1e', margin: '8px 0' }} />
          <a href="https://community.kerdos.app" target="_blank" rel="noopener noreferrer" style={{ ...navLinkStyle, display: 'block', padding: '10px 10px' }}>Community</a>
          <a href="https://github.com/kerdos" target="_blank" rel="noopener noreferrer" style={{ ...navLinkStyle, display: 'block', padding: '10px 10px' }}>GitHub</a>
        </div>
      )}

      {/* Responsive styles + Sync tooltip */}
      <style>{`
        @media (max-width: 768px) {
          .kerdos-nav-links { display: none !important; }
          .kerdos-nav-tools { display: none !important; }
          .kerdos-mobile-hamburger { display: flex !important; }
          .kerdos-mobile-menu { display: flex !important; }
        }
        .kerdos-sync-link::after {
          content: 'End-to-end encrypted sync coming in v2.0';
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          background: #1e1f22;
          border: 1px solid #303033;
          color: #dcddde;
          font-size: 12px;
          border-radius: 5px;
          padding: 6px 10px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s;
          z-index: 1002;
        }
        .kerdos-sync-link:hover::after {
          opacity: 1;
        }
      `}</style>
    </nav>
  );
}
