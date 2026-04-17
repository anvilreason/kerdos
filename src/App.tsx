import { useEffect, useRef, useState, useCallback } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import TabBar from '@/components/layout/TabBar';
import StatusBar from '@/components/layout/StatusBar';
import CommandPalette from '@/components/layout/CommandPalette';
import DemoExitBanner from '@/components/DemoExitBanner';
import Dashboard from '@/pages/Dashboard';
import Assets from '@/pages/Assets';
import History from '@/pages/History';
import Settings from '@/pages/Settings';
import Transactions from '@/pages/Transactions';
import LandingPage from '@/pages/landing/LandingPage';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import { useNetWorth } from '@/hooks/useNetWorth';
import { useAssets } from '@/hooks/useAssets';
import { usePrices } from '@/hooks/usePrices';
import { useSettings } from '@/stores/settingsStore';
import {
  checkAndCreateSnapshot,
  createIntradaySnapshot,
  pruneOldIntradaySnapshots,
} from '@/services/snapshotService';
import { enterDemoMode } from '@/services/demoMode';
import { useFxRates } from '@/hooks/useFxRates';
import { exportToJSON, downloadFile } from '@/utils/export';
import { db } from '@/db';
import type { Asset } from '@/types/asset';

function AppLayout() {
  const { refetch } = useNetWorth();
  const { assets } = useAssets();
  const { prices, refetch: refetchPrices, marketStatus } = usePrices(assets);
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Auto-create daily snapshot on app load
  useEffect(() => {
    checkAndCreateSnapshot().catch((err) =>
      console.error('[snapshot] Auto-snapshot failed:', err),
    );
  }, []);

  // One-shot retention pass on startup (silent). Safe to run before the
  // polling effect below because it only deletes intraday rows older
  // than 90 days; it can't race with a fresh intraday write.
  useEffect(() => {
    pruneOldIntradaySnapshots(90).catch((err) =>
      console.error('[snapshot] Intraday prune failed:', err),
    );
  }, []);

  // Intraday snapshot scheduler (W2-04).
  //
  // Triggered by two signals:
  //   1. `prices` updating (usePrices just fetched — valuations are fresh)
  //   2. `marketStatus` flipping to open for any market
  //
  // Guarded by:
  //   - At least one relevant market open (via usePrices.marketStatus)
  //   - Last intraday write was ≥ settings.snapshotIntervalMin minutes ago
  //     (tracked via `lastIntradayAtRef`, in-memory — survives within the
  //     session. On reload we may write one extra tick, which is fine:
  //     the id `intra-YYYYMMDDTHHmm` dedupes same-minute duplicates.)
  const lastIntradayAtRef = useRef<number>(0);
  useEffect(() => {
    const anyOpen = Object.values(marketStatus).some(Boolean);
    if (!anyOpen) return;

    const intervalMs = settings.snapshotIntervalMin * 60_000;
    const now = Date.now();
    if (now - lastIntradayAtRef.current < intervalMs) return;

    lastIntradayAtRef.current = now;
    createIntradaySnapshot().catch((err) =>
      console.error('[snapshot] Intraday snapshot failed:', err),
    );
    // We intentionally depend on `prices` so a fresh price fetch pumps the
    // check; depending on marketStatus handles session open/close edges.
  }, [prices, marketStatus, settings.snapshotIntervalMin]);

  // Cmd+K listener for command palette
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAddAsset = () => {
    navigate('/app/assets');
  };

  const handleExportJSON = useCallback(async () => {
    const allAssets = await db.assets.toArray();
    const allSnapshots = await db.snapshots.toArray();
    const json = exportToJSON({ assets: allAssets, snapshots: allSnapshots });
    downloadFile(json, 'kerdos-export.json', 'application/json');
  }, []);

  const handleTakeSnapshot = useCallback(async () => {
    try {
      await checkAndCreateSnapshot();
    } catch (err) {
      console.error('[snapshot] Manual snapshot failed:', err);
    }
  }, []);

  const handleSelectAsset = useCallback(
    (_asset: Asset) => {
      navigate('/app/assets');
    },
    [navigate],
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--color-base-00)',
        color: 'var(--color-text-normal)',
      }}
    >
      {/* TopBar spans full width */}
      <TopBar onRefresh={refetch} onAddAsset={handleAddAsset} />

      {/* Middle row: Sidebar + Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <Sidebar
          selectedAssetId={selectedAssetId}
          onSelectAsset={setSelectedAssetId}
          onAddAsset={handleAddAsset}
        />

        {/* Main content area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          {/* TabBar */}
          <TabBar />

          {/* Content */}
          <main
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 0,
              background: 'var(--color-base-05)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Demo Mode banner (auto-shows when isDemo rows exist) */}
            <DemoExitBanner />
            <div style={{ flex: 1, padding: '16px 24px', minHeight: 0 }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/assets" element={<Assets />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/history" element={<History />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>

      {/* StatusBar spans full width */}
      <StatusBar onRefresh={refetch} />

      {/* Command Palette overlay */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        assets={assets}
        prices={prices}
        baseCurrency={settings.baseCurrency}
        onAddAsset={handleAddAsset}
        onSelectAsset={handleSelectAsset}
        onExportJSON={handleExportJSON}
        onRefreshPrices={refetchPrices}
        onTakeSnapshot={handleTakeSnapshot}
      />
    </div>
  );
}

/**
 * DemoEntry — hidden route at `#/demo`.
 *
 * Clears any existing assets/snapshots and bulk-loads the deterministic
 * demo portfolio from W2-05, then forwards to the dashboard. We render
 * a lightweight full-screen loader while the work happens so the user
 * doesn't see a flash of empty dashboard before the data lands.
 */
function DemoEntry() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Guard against React 18 StrictMode double-invoke. The DB work is
    // idempotent (we transactionally clear + bulkPut), but doing it
    // twice would still re-run for no reason.
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    // Data-loss guard (W4 hardening): if the user already has real
    // (non-demo) assets, enterDemoMode() would silently wipe them.
    // Prompt for explicit consent before touching existing data.
    (async () => {
      try {
        const realCount = await db.assets
          .filter((a) => a.isDemo !== true)
          .count();

        if (realCount > 0) {
          const proceed = window.confirm(
            t('demoMode.overwriteConfirm', {
              count: realCount,
              defaultValue: `You have ${realCount} real asset(s) saved. Entering demo mode will wipe them. Continue?`,
            }),
          );
          if (!proceed) {
            navigate('/app/', { replace: true });
            return;
          }
        }

        await enterDemoMode(90);
        navigate('/app/', { replace: true });
      } catch (err) {
        console.error('[DemoEntry] enterDemoMode failed:', err);
        // Fall back to the app anyway — the banner won't appear and
        // the user sees whatever state the DB is in, which is better
        // than being stuck on a loader.
        navigate('/app/', { replace: true });
      }
    })();
  }, [navigate, t]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0d0d0d',
        color: 'var(--kerdos-text-primary, #dcddde)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Spinner */}
      <div
        aria-hidden="true"
        style={{
          width: 36,
          height: 36,
          border: '3px solid rgba(201,151,42,0.2)',
          borderTopColor: '#c9972a',
          borderRadius: '50%',
          animation: 'kerdos-spin 0.9s linear infinite',
        }}
      />
      <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>
        {t('demoMode.entering', 'Loading demo data...')}
      </p>
      <style>{`
        @keyframes kerdos-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function App() {
  // Kick off the FX-rates loader at app root so every screen (Landing
  // demo cards, Dashboard, Onboarding preview) gets real rates instead
  // of the stale 2024 hardcoded table. Side-effect: mutates the live
  // table in src/utils/currency.ts so synchronous convertCurrency()
  // callers see fresh numbers on their next render.
  useFxRates();
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo" element={<DemoEntry />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/app/*" element={<AppLayout />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
