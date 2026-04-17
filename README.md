# Kerdos

**Your wealth, recalculated every minute.**

A free, local-first asset tracker. Stocks, crypto, cash, and more — all recalculated live, all on your device. No signup, no cloud, no tracking.

---

## What Kerdos is (and isn't)

**Kerdos is** a tool for individuals who want to see their net worth move in real time across multiple asset classes and currencies, without handing their financial data to a cloud vendor.

**Kerdos isn't** a budgeting app, a broker, an investment advisor, or a social trading platform.

---

## Core principles

- **Local-first**: every asset, every snapshot, every setting lives in your browser's IndexedDB (Web) or the local SQLite file bundled with the desktop app (Tauri). Nothing leaves the device.
- **No account, no login**: open the app, start tracking. That's it.
- **Real-time during market hours**: the app polls public market APIs during open hours and caches aggressively off-hours.
- **Multi-market, multi-currency**: US equities, A-shares, Hong Kong, ETFs, crypto, precious metals, forex, cash, real estate (manual valuation), vehicles (manual).
- **Professional analytics**: TWR / XIRR / max drawdown / benchmark comparison — the same indicators institutional investors use.

---

## Status (v2.0 in progress)

Kerdos is being rebuilt from a prior prototype. See `../KERDOS_V2_PLAN.md` for the active 4-week roadmap, agent team architecture, and task-level tracking.

### Shipped so far
- Web app with Dashboard / Assets / History / Settings
- Landing page
- Daily snapshot automation
- JSON export / import
- 15-language i18n
- Cmd+K command palette

### In progress (W1–W4)
- W1: Brand consolidation, Cloudflare Worker quote relay, DB migrations, Tauri scaffolding
- W2: Ticker search, asset-type inference, market-hour-aware polling, intraday snapshots
- W3: TWR / XIRR / max drawdown / benchmark comparison / currency exposure
- W4: Demo Mode, Landing rewrite (Notion-style), Tauri desktop MVP

---

## Tech stack

- **Frontend**: React 19 + TypeScript + Vite 8 + Tailwind CSS v4
- **State / Data**: Zustand-style custom stores + Dexie (IndexedDB)
- **Charts**: Recharts + Chart.js
- **i18n**: i18next + react-i18next
- **Quote relay** (under `worker/`): Cloudflare Workers + KV
- **Desktop**: Tauri 2 (scaffolded in W1-05)

---

## Development

```bash
# Install
npm install

# Web dev server
npm run dev          # http://localhost:5173

# Local quote relay (in a second terminal)
cd worker && npx wrangler dev --port 8787

# Type check
tsc -b

# Build for production
npm run build
```

Desktop (Tauri) commands are added in W1-05.

---

## Project layout

```
wealthlens/
├── src/
│   ├── pages/           # Route targets (Dashboard, Assets, History, Settings, Landing)
│   ├── components/      # Dashboard cards, asset forms, layout chrome
│   ├── services/        # Price providers, snapshot service
│   ├── hooks/           # useAssets, useNetWorth, usePrices, useSnapshots
│   ├── stores/          # Settings store
│   ├── db/              # Dexie schema + migrations (legacy DB name preserved)
│   ├── types/           # Asset, Price, Snapshot
│   ├── utils/           # Currency, formatters, export, animations
│   └── i18n/            # 15 locales
├── worker/              # Cloudflare Worker quote relay (W1-03)
└── public/
```

---

## Privacy

Kerdos does not collect, transmit, or store any user financial data on any server. The Cloudflare Worker under `worker/` only relays public market quote requests (tickers, not holdings). No telemetry.

---

## Contributing

This is a solo-in-public rebuild right now; issues and suggestions welcome via GitHub once the repo is public.

---

## License

TBD.
