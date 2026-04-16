import { useEffect, useState, useCallback } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import TabBar from '@/components/layout/TabBar';
import StatusBar from '@/components/layout/StatusBar';
import CommandPalette from '@/components/layout/CommandPalette';
import Dashboard from '@/pages/Dashboard';
import Assets from '@/pages/Assets';
import History from '@/pages/History';
import Settings from '@/pages/Settings';
import LandingPage from '@/pages/landing/LandingPage';
import { useNetWorth } from '@/hooks/useNetWorth';
import { useAssets } from '@/hooks/useAssets';
import { usePrices } from '@/hooks/usePrices';
import { useSettings } from '@/stores/settingsStore';
import { checkAndCreateSnapshot } from '@/services/snapshotService';
import { exportToJSON, downloadFile } from '@/utils/export';
import { db } from '@/db';
import type { Asset } from '@/types/asset';

function AppLayout() {
  const { refetch } = useNetWorth();
  const { assets } = useAssets();
  const { prices, refetch: refetchPrices } = usePrices(assets);
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
    downloadFile(json, 'wealthlens-export.json', 'application/json');
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
              padding: '16px 24px',
              background: 'var(--color-base-05)',
            }}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
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

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app/*" element={<AppLayout />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
