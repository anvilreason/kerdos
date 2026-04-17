import { useState, useEffect, useRef, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';
import { PriceSimulator, REGIONAL_ASSETS, FX_RATES } from './PriceSimulator';
import type { Snapshot, DemoAsset } from './PriceSimulator';

Chart.register(...registerables);

// ─── Styles ───────────────────────────────────────────────
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const GOLD = '#c9972a';
const GREEN = '#22c55e';
const RED = '#ef4444';
const BG_DARK = '#1a1b1e';
const BG_PANEL = '#252528';
const BG_CENTER = '#1e1f22';
const BORDER = '#303033';
const TEXT = '#dcddde';
const TEXT_MUTED = '#888891';
const TEXT_FAINT = '#5a5a60';

// ─── Helpers ──────────────────────────────────────────────
function fmtCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}
function fmtPrice(value: number, currency = 'USD'): string {
  const digits = value >= 10000 ? 0 : value >= 100 ? 2 : 2;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}
function fmtPct(value: number): string {
  return (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
}
function fmtShort(value: number, currency = 'USD'): string {
  if (Math.abs(value) >= 1_000_000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value / 1_000_000) + 'M';
  }
  return fmtCurrency(value, currency);
}

type AssetGroup = { label: string; type: string; assets: DemoAsset[]; manualBadge: boolean };

function groupAssets(assets: DemoAsset[]): AssetGroup[] {
  const stocks = assets.filter(a => a.type === 'us_stock');
  const crypto = assets.filter(a => a.type === 'crypto');
  const re = assets.filter(a => a.ticker === 'HOME');
  const vehicle = assets.filter(a => a.ticker === 'TSLA_CAR');
  return [
    { label: 'Stocks', type: 'us_stock', assets: stocks, manualBadge: false },
    { label: 'Crypto', type: 'crypto', assets: crypto, manualBadge: false },
    { label: 'Real Estate', type: 'manual_re', assets: re, manualBadge: true },
    { label: 'Vehicle', type: 'manual_car', assets: vehicle, manualBadge: true },
  ];
}

function getSource(asset: DemoAsset): { name: string; interval: string } {
  if (asset.type === 'us_stock') return { name: 'Yahoo Finance', interval: '5 min' };
  if (asset.type === 'crypto') return { name: 'CoinGecko', interval: '60 sec' };
  return { name: 'Manual Entry', interval: 'N/A' };
}

// ─── Flash animation style tag ────────────────────────────
const FLASH_STYLE = `
@keyframes price-flash-up { 0%{color:${GREEN}} 100%{color:inherit} }
@keyframes price-flash-down { 0%{color:${RED}} 100%{color:inherit} }
.pf-up { animation: price-flash-up 0.6s ease-out; }
.pf-down { animation: price-flash-down 0.6s ease-out; }
`;

// ─── Component ────────────────────────────────────────────
export default function DemoWindow() {
  const simRef = useRef(new PriceSimulator());
  const [snapshot, setSnapshot] = useState<Snapshot>(() => simRef.current.getSnapshot());
  const [selectedTicker, setSelectedTicker] = useState('NVDA');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ manual_re: true, manual_car: true });
  const [flashMap, setFlashMap] = useState<Record<string, 'up' | 'down' | ''>>({});
  const [currency, setCurrency] = useState('USD');
  const [_region, setRegion] = useState('us');

  const mainChartRef = useRef<HTMLCanvasElement>(null);
  const sparklineRef = useRef<HTMLCanvasElement>(null);
  const mainChartInstance = useRef<Chart | null>(null);
  const sparklineInstance = useRef<Chart | null>(null);

  // Listen for region change
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { region: string; currency: string } | undefined;
      if (!detail) return;
      setRegion(detail.region);
      setCurrency(detail.currency);
      const regional = REGIONAL_ASSETS[detail.region];
      if (regional) {
        simRef.current.updateManualAssets(
          regional.home.label, regional.home.value / FX_RATES[detail.currency],
          regional.car.label, regional.car.value / FX_RATES[detail.currency]
        );
      }
    };
    window.addEventListener('kerdos-region-change', handler);
    return () => window.removeEventListener('kerdos-region-change', handler);
  }, []);

  // Tick every 2.5s
  useEffect(() => {
    const id = setInterval(() => {
      const prev = simRef.current.getSnapshot();
      const next = simRef.current.tick();
      // Compute flash
      const fm: Record<string, 'up' | 'down' | ''> = {};
      for (let i = 0; i < next.assets.length; i++) {
        const diff = next.assets[i].price - prev.assets[i].price;
        if (diff > 0) fm[next.assets[i].ticker] = 'up';
        else if (diff < 0) fm[next.assets[i].ticker] = 'down';
        else fm[next.assets[i].ticker] = '';
      }
      setFlashMap(fm);
      setSnapshot(next);
      // Clear flash after animation
      setTimeout(() => setFlashMap({}), 600);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // Initialize main chart
  const initMainChart = useCallback(() => {
    if (!mainChartRef.current) return;
    if (mainChartInstance.current) mainChartInstance.current.destroy();
    const ctx = mainChartRef.current.getContext('2d');
    if (!ctx) return;
    const gradient = ctx.createLinearGradient(0, 0, 0, 140);
    gradient.addColorStop(0, 'rgba(201,151,42,0.25)');
    gradient.addColorStop(1, 'rgba(201,151,42,0)');
    mainChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: snapshot.netWorthHistory.map((_, i) => String(i)),
        datasets: [{
          data: snapshot.netWorthHistory,
          borderColor: GOLD,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: {
            position: 'right',
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: {
              color: TEXT_MUTED,
              font: { family: MONO, size: 10 },
              callback: (val) => fmtShort(val as number, currency),
              maxTicksLimit: 4,
            },
            border: { display: false },
          },
        },
        animation: { duration: 300 },
      },
    });
    // Chart instance is created once per mount; data mutations happen via
    // `chartInstance.data = ...; chartInstance.update()` below, so we
    // intentionally don't re-run this effect when `currency` or history
    // change. Re-creating the Chart would thrash the canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize sparkline
  const initSparkline = useCallback(() => {
    if (!sparklineRef.current) return;
    if (sparklineInstance.current) sparklineInstance.current.destroy();
    const selected = snapshot.assets.find(a => a.ticker === selectedTicker);
    const data = selected ? selected.history : [];
    sparklineInstance.current = new Chart(sparklineRef.current, {
      type: 'line',
      data: {
        labels: data.map((_, i) => String(i)),
        datasets: [{
          data,
          borderColor: GOLD,
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.4,
          fill: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        animation: { duration: 200 },
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicker]);

  // Mount charts
  useEffect(() => { initMainChart(); }, [initMainChart]);
  useEffect(() => { initSparkline(); }, [initSparkline]);

  // Update chart data on snapshot change
  useEffect(() => {
    if (mainChartInstance.current) {
      const chart = mainChartInstance.current;
      chart.data.labels = snapshot.netWorthHistory.map((_, i) => String(i));
      chart.data.datasets[0].data = snapshot.netWorthHistory;
      chart.update('none');
    }
    if (sparklineInstance.current) {
      const selected = snapshot.assets.find(a => a.ticker === selectedTicker);
      if (selected) {
        const chart = sparklineInstance.current;
        chart.data.labels = selected.history.map((_, i) => String(i));
        chart.data.datasets[0].data = selected.history;
        chart.update('none');
      }
    }
  }, [snapshot, selectedTicker]);

  // Cleanup
  useEffect(() => {
    return () => {
      mainChartInstance.current?.destroy();
      sparklineInstance.current?.destroy();
    };
  }, []);

  const groups = groupAssets(snapshot.assets);
  const selectedAsset = snapshot.assets.find(a => a.ticker === selectedTicker) ?? snapshot.assets[0];
  const source = getSource(selectedAsset);
  const isGain = snapshot.netWorthChange >= 0;
  const selectedIsGain = selectedAsset.changePct >= 0;

  return (
    <>
      <style>{FLASH_STYLE}</style>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        borderRadius: 12,
        border: `1px solid ${BORDER}`,
        background: BG_DARK,
        boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
        overflow: 'hidden',
        userSelect: 'none',
      }}>
        {/* ── Title Bar ── */}
        <div style={{
          height: 40,
          background: BG_PANEL,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: `1px solid ${BORDER}`,
          position: 'relative',
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
          </div>
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 13,
            fontWeight: 600,
            color: TEXT_MUTED,
          }}>
            Kerdos — My Portfolio
          </div>
          <div style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            color: GREEN,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
          }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: GREEN,
              animation: 'pulse 2s ease-in-out infinite',
            }} />
            LIVE
          </div>
        </div>

        {/* ── 3-Panel Grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr 240px',
          height: 520,
        }}>
          {/* ── LEFT SIDEBAR ── */}
          <div style={{
            background: BG_PANEL,
            borderRight: `1px solid ${BORDER}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Portfolio header */}
            <div style={{ padding: '16px 14px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6 }}>
                My Portfolio
              </div>
              <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: TEXT, fontFeatureSettings: '"tnum" 1' }}>
                {fmtCurrency(snapshot.netWorth, currency)}
              </div>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: isGain ? GREEN : RED,
                fontFamily: MONO,
                fontFeatureSettings: '"tnum" 1',
              }}>
                {isGain ? '+' : ''}{fmtCurrency(snapshot.netWorthChange, currency)} today
              </div>
            </div>

            {/* Nav items */}
            <div style={{ padding: '0 8px' }}>
              {['Dashboard', 'Assets', 'History'].map((item, i) => (
                <div key={item} style={{
                  padding: '6px 10px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: i === 0 ? GOLD : TEXT_MUTED,
                  borderLeft: i === 0 ? `2px solid ${GOLD}` : '2px solid transparent',
                  background: i === 0 ? 'rgba(201,151,42,0.08)' : 'transparent',
                  borderRadius: '0 4px 4px 0',
                  marginBottom: 2,
                  cursor: 'default',
                }}>
                  {item}
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: BORDER, margin: '10px 14px' }} />

            {/* ASSETS label */}
            <div style={{ padding: '0 14px', fontSize: 10, fontWeight: 700, color: TEXT_FAINT, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>
              ASSETS
            </div>

            {/* Asset tree */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
              {groups.map(group => {
                const isCollapsed = collapsed[group.type] ?? false;
                return (
                  <div key={group.type}>
                    <div
                      onClick={() => setCollapsed(c => ({ ...c, [group.type]: !isCollapsed }))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 6px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: TEXT_MUTED,
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: 10, width: 12 }}>{isCollapsed ? '▶' : '▼'}</span>
                      {group.label} ({group.assets.length})
                      {group.manualBadge && (
                        <span style={{
                          marginLeft: 'auto',
                          fontSize: 9,
                          fontWeight: 600,
                          color: '#f59e0b',
                          background: 'rgba(245,158,11,0.12)',
                          padding: '1px 5px',
                          borderRadius: 3,
                          textTransform: 'uppercase' as const,
                        }}>Manual</span>
                      )}
                    </div>
                    {!isCollapsed && group.assets.map(asset => (
                      <div
                        key={asset.ticker}
                        onClick={() => setSelectedTicker(asset.ticker)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '3px 6px 3px 24px',
                          fontSize: 12,
                          color: selectedTicker === asset.ticker ? TEXT : TEXT_MUTED,
                          background: selectedTicker === asset.ticker ? 'rgba(201,151,42,0.08)' : 'transparent',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontFamily: MONO,
                          fontFeatureSettings: '"tnum" 1',
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{asset.ticker}</span>
                        <span className={flashMap[asset.ticker] === 'up' ? 'pf-up' : flashMap[asset.ticker] === 'down' ? 'pf-down' : ''} style={{
                          color: asset.changePct >= 0 ? GREEN : RED,
                          fontSize: 11,
                        }}>
                          {asset.volatility > 0 ? fmtPct(asset.changePct) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: '10px 14px', borderTop: `1px solid ${BORDER}` }}>
              <div style={{
                fontSize: 12,
                fontWeight: 500,
                color: GOLD,
                textAlign: 'center',
                cursor: 'default',
              }}>
                + Add Asset
              </div>
            </div>
          </div>

          {/* ── CENTER MAIN ── */}
          <div style={{
            background: BG_CENTER,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Tab bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              borderBottom: `1px solid ${BORDER}`,
              padding: '0 12px',
              height: 36,
              gap: 0,
            }}>
              {['Overview', 'Assets', 'History'].map((tab, i) => (
                <div key={tab} style={{
                  padding: '0 14px',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 13,
                  fontWeight: 500,
                  color: i === 0 ? GOLD : TEXT_MUTED,
                  borderBottom: i === 0 ? `2px solid ${GOLD}` : '2px solid transparent',
                  cursor: 'default',
                }}>
                  {tab}
                </div>
              ))}
              <div style={{
                padding: '0 10px',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                fontSize: 16,
                color: TEXT_FAINT,
                cursor: 'default',
              }}>+</div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              {/* Metrics row */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{
                  flex: 1,
                  background: BG_PANEL,
                  borderRadius: 8,
                  padding: '12px 14px',
                  border: `1px solid ${BORDER}`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>
                    TOTAL NET WORTH
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: TEXT, fontFeatureSettings: '"tnum" 1' }}>
                    {fmtCurrency(snapshot.netWorth, currency)}
                  </div>
                </div>
                <div style={{
                  flex: 1,
                  background: BG_PANEL,
                  borderRadius: 8,
                  padding: '12px 14px',
                  border: `1px solid ${BORDER}`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>
                    TODAY&apos;S GAIN
                  </div>
                  <div style={{
                    fontFamily: MONO,
                    fontSize: 20,
                    fontWeight: 700,
                    color: isGain ? GREEN : RED,
                    fontFeatureSettings: '"tnum" 1',
                  }}>
                    {isGain ? '+' : ''}{fmtCurrency(snapshot.netWorthChange, currency)}
                    <span style={{ fontSize: 13, marginLeft: 6, fontWeight: 500 }}>
                      ({fmtPct(snapshot.netWorthChangePct)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart card */}
              <div style={{
                background: BG_PANEL,
                borderRadius: 8,
                padding: '12px 14px',
                border: `1px solid ${BORDER}`,
                marginBottom: 14,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>Net Worth History</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['7D', '30D', '90D', '1Y'].map((range, i) => (
                      <div key={range} style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: i === 1 ? GOLD : TEXT_FAINT,
                        background: i === 1 ? 'rgba(201,151,42,0.12)' : 'transparent',
                        padding: '2px 8px',
                        borderRadius: 4,
                        cursor: 'default',
                      }}>{range}</div>
                    ))}
                  </div>
                </div>
                <div style={{ height: 140 }}>
                  <canvas ref={mainChartRef} />
                </div>
              </div>

              {/* Asset list */}
              <div style={{
                background: BG_PANEL,
                borderRadius: 8,
                border: `1px solid ${BORDER}`,
                overflow: 'hidden',
              }}>
                {/* Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 100px 80px',
                  padding: '6px 14px',
                  fontSize: 10,
                  fontWeight: 600,
                  color: TEXT_FAINT,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.05em',
                  borderBottom: `1px solid ${BORDER}`,
                }}>
                  <span>Asset</span>
                  <span style={{ textAlign: 'right' }}>Price</span>
                  <span style={{ textAlign: 'right' }}>Value</span>
                  <span style={{ textAlign: 'right' }}>Change</span>
                </div>
                {snapshot.assets.map(asset => (
                  <div
                    key={asset.ticker}
                    onClick={() => setSelectedTicker(asset.ticker)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 100px 100px 80px',
                      padding: '8px 14px',
                      fontSize: 12,
                      cursor: 'pointer',
                      background: selectedTicker === asset.ticker ? 'rgba(201,151,42,0.06)' : 'transparent',
                      borderBottom: `1px solid rgba(48,48,51,0.5)`,
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: TEXT, fontFamily: MONO, fontFeatureSettings: '"tnum" 1' }}>{asset.ticker}</span>
                      <span style={{ color: TEXT_MUTED, fontSize: 11, marginLeft: 8 }}>{asset.name}</span>
                    </div>
                    <div className={flashMap[asset.ticker] === 'up' ? 'pf-up' : flashMap[asset.ticker] === 'down' ? 'pf-down' : ''} style={{
                      textAlign: 'right',
                      fontFamily: MONO,
                      fontFeatureSettings: '"tnum" 1',
                      color: TEXT,
                    }}>
                      {fmtPrice(asset.price, currency)}
                    </div>
                    <div style={{
                      textAlign: 'right',
                      fontFamily: MONO,
                      fontFeatureSettings: '"tnum" 1',
                      color: TEXT,
                    }}>
                      {fmtCurrency(asset.price * asset.quantity, currency)}
                    </div>
                    <div style={{
                      textAlign: 'right',
                      fontFamily: MONO,
                      fontFeatureSettings: '"tnum" 1',
                      color: asset.changePct >= 0 ? GREEN : RED,
                      fontSize: 11,
                    }}>
                      {asset.volatility > 0 ? fmtPct(asset.changePct) : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT DETAIL PANEL ── */}
          <div style={{
            background: BG_PANEL,
            borderLeft: `1px solid ${BORDER}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            padding: '16px 14px',
          }}>
            {/* Header */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: TEXT, fontFamily: MONO }}>{selectedAsset.ticker}</div>
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 8 }}>{selectedAsset.name}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: selectedAsset.type === 'us_stock' ? '#60a5fa' : selectedAsset.type === 'crypto' ? '#a78bfa' : '#f59e0b',
                  background: selectedAsset.type === 'us_stock' ? 'rgba(96,165,250,0.12)' : selectedAsset.type === 'crypto' ? 'rgba(167,139,250,0.12)' : 'rgba(245,158,11,0.12)',
                  padding: '2px 8px',
                  borderRadius: 4,
                  textTransform: 'uppercase' as const,
                }}>
                  {selectedAsset.type === 'us_stock' ? 'US Stock' : selectedAsset.type === 'crypto' ? 'Crypto' : 'Manual'}
                </span>
              </div>
            </div>

            {/* Metrics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Current Price', value: fmtPrice(selectedAsset.price, currency) },
                { label: 'Holdings', value: `${selectedAsset.quantity} ${selectedAsset.type === 'us_stock' ? 'shares' : selectedAsset.type === 'crypto' ? 'units' : ''}`.trim() },
                { label: 'Market Value', value: fmtCurrency(selectedAsset.price * selectedAsset.quantity, currency) },
                { label: 'Cost Basis', value: fmtCurrency(selectedAsset.basePrice * selectedAsset.quantity, currency) },
                { label: 'Unrealized P&L', value: fmtCurrency((selectedAsset.price - selectedAsset.basePrice) * selectedAsset.quantity, currency), isChange: true },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: TEXT_MUTED }}>{item.label}</span>
                  <span style={{
                    color: item.isChange ? (selectedIsGain ? GREEN : RED) : TEXT,
                    fontWeight: 600,
                    fontFamily: MONO,
                    fontFeatureSettings: '"tnum" 1',
                  }}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* Sparkline */}
            <div style={{
              height: 60,
              marginBottom: 16,
              background: 'rgba(0,0,0,0.15)',
              borderRadius: 6,
              padding: 4,
            }}>
              <canvas ref={sparklineRef} />
            </div>

            {/* Source info */}
            <div style={{
              background: 'rgba(0,0,0,0.15)',
              borderRadius: 6,
              padding: '10px 12px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_FAINT, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>
                DATA SOURCE
              </div>
              {[
                { label: 'Source', value: source.name },
                { label: 'Refresh', value: source.interval },
                { label: 'Status', value: selectedAsset.volatility > 0 ? 'Live' : 'Static', color: selectedAsset.volatility > 0 ? GREEN : '#f59e0b' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: TEXT_MUTED }}>{item.label}</span>
                  <span style={{ color: item.color ?? TEXT, fontWeight: 500 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Status Bar ── */}
        <div style={{
          height: 24,
          background: BG_PANEL,
          borderTop: `1px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          fontSize: 11,
          color: TEXT_MUTED,
          gap: 12,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, display: 'inline-block' }} />
            All prices live
          </span>
          <span>Last refresh: just now</span>
          <span>6 assets</span>
          <span>{currency}</span>
          <span style={{ marginLeft: 'auto', cursor: 'default' }}>&#x27F3; Refresh</span>
        </div>
      </div>

      {/* Pulse animation for live dot */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}
