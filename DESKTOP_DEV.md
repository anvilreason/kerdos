# Kerdos Desktop — Developer Guide

This document covers how to run and build the **Tauri 2** desktop shell of
Kerdos. For the Web (Vite) workflow see `README.md`.

## Prerequisites

| Tool                 | Minimum version | Notes                                                                |
| -------------------- | --------------- | -------------------------------------------------------------------- |
| Rust                 | 1.77+           | Already installed in the W1 dev environment (`rustc --version`).     |
| Node.js              | 20+             | Same version as the Web build.                                       |
| npm                  | 10+             | Ships with Node 20.                                                  |
| Xcode CLT (macOS)    | 15+             | `xcode-select --install`. Needed for the macOS WebView and codesign. |
| MSVC Build Tools (Windows) | 2022      | VS 2022 "Desktop development with C++" workload.                     |
| WebKit2GTK (Linux)   | 4.1             | `sudo apt install libwebkit2gtk-4.1-dev` on Debian/Ubuntu.           |

The `@tauri-apps/cli` npm package is already pinned in `package.json`
(`devDependencies`). No global install is needed.

## First-time setup

```bash
# From the repository root (wealthlens/)
npm install
```

That single `npm install` pulls in the Tauri CLI; the Rust side fetches its
own crate dependencies on first build.

## Run the app in development

```bash
npm run tauri:dev
```

What happens:

1. Vite starts on `http://localhost:5173` (uses the existing `dev` script).
2. Tauri compiles the Rust shell. **The first compile takes 5–15 minutes**
   (cold crate cache). Subsequent runs reuse `src-tauri/target/` and are
   sub-minute.
3. A native window opens pointing at the Vite dev server. HMR works as in
   a browser.

Leave the terminal open — closing it kills both processes.

### Gotchas

- **Port 5173 is hard-coded** in `src-tauri/tauri.conf.json` (`devUrl`). If
  you override the Vite port, update `tauri.conf.json` too.
- **Web HashRouter**: the app uses `HashRouter`, which works identically
  inside Tauri — no route changes are required between Web and Desktop.
- **CORS**: the desktop WebView is *not* subject to CORS. New providers
  should import `proxiedFetch` from
  `src/services/providers/adapter.ts` — it auto-routes through the public
  CORS proxy on Web and hits the provider directly on Desktop.

## Production build

```bash
npm run tauri:build
```

**Not performed in W4.** A production bundle takes 10–20 minutes on a
clean machine and — on macOS — requires a valid Apple Developer ID
certificate + notarisation credentials to produce a distributable `.dmg`.
We will revisit the build pipeline (CI + codesign) when the product is
ready to ship. Until then, `tauri:build` stays un-invoked.

## Icons

Placeholder icons live in `src-tauri/icons/` (generated in W3 via
`npx @tauri-apps/cli icon` from a one-colour PNG). They are good enough
for `tauri:dev` and for local `tauri:build` smoke tests. Replacement with
the real brand mark is tracked in `src-tauri/icons/README.md`.

## Runtime detection

Frontend code that needs to branch on "am I in Tauri?" should read:

```ts
import { isTauri } from '@/services/providers/adapter';
```

`isTauri` is a module-level constant evaluated once. It checks both
`window.__TAURI_INTERNALS__` (Tauri 2) and `window.__TAURI__` (Tauri 1
plugins) to be upgrade-safe.

## Troubleshooting

- **`error: linker 'cc' not found` on macOS** → run
  `xcode-select --install`.
- **Rust compile stalls on first run** → it isn't stalled, the crate
  graph is large. Check `top` / `htop`; you should see `rustc` busy.
- **Window opens blank** → Vite dev server isn't up yet. Wait for the
  `VITE vX.X.X ready in …ms` line in the terminal, then refresh with
  `Cmd/Ctrl+R` inside the Tauri window.
