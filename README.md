# Pocketo（ポケット）

A minimal, Japanese-inspired income & expense tracker — built as an installable PWA.
Log a transaction in 3 taps, split income into pockets automatically, and estimate your Thai personal income tax. All data stays on your device.

## Features

- **Quick logging** — amount → category → done. One entry takes 3 taps.
- **Pockets** — divide money into savings / investing / spending boxes with auto-allocation rules (e.g. 20% of every income goes to savings) and goal tracking rendered as an ink-circle progress ring.
- **Kakeibo reports** — expenses grouped under the four classic kakeibo pillars (Needs / Wants / Culture / Unexpected), category donut chart, and a 6-month trend.
- **Recurring transactions** — salary, rent, subscriptions posted automatically on a chosen day of month; months you missed while the app was closed are caught up on next launch, and upcoming items show on the dashboard.
- **Monthly budgets** — set a budget per category; progress bars shift green → amber → red as you approach the limit.
- **Shareable summary card** — render the month (net, top categories, kakeibo pillars) to a 1080×1350 PNG via the canvas API and share or download it.
- **Thai tax estimator** — progressive brackets (0–35%), standard 50% expense deduction, allowance caps (SSF / RMF / Thai ESG / PVD / insurance / social security / home-loan interest / donations), withholding-tax refund calculation, and a "buy X more, save Y" simulator. Pre-fills your yearly income from logged records.
- **Local-first** — everything lives in IndexedDB on your device. No server, no account, no tracking. JSON export/import for backup and migration.
- **Dark / light / system theme** — dark by default, both themes meet WCAG AA contrast.
- **Installable PWA** — works fully offline after the first load. Add to home screen from Safari or Chrome; no app store needed.

## Tech

- React 18 + Vite + TypeScript (strict)
- Tailwind CSS — design tokens via CSS variables (washi-paper light theme, sumi-ink dark theme, vermilion accent)
- Dexie.js over IndexedDB, schema versioned for safe migrations
- vite-plugin-pwa (Workbox) for offline support
- Vitest — money, allocation, tax and backup engines are pure functions with full unit coverage
- Hand-rolled SVG charts (donut, rings, bars) — no chart library, keeps the bundle under 100 KB gzip

Amounts are stored as integer satang to avoid floating-point drift. Pocket balances are always derived from the transaction log, never stored, so they can't desync.

## Development

```bash
npm install
npm run dev       # local dev server
npm test          # unit tests (39 tests)
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build
npm run icons     # regenerate PWA icons (pure-node PNG writer)
```

## Deploy

The app is a static site. Any static host works; for GitHub Pages the production build uses the `/pocketo/` base path:

```bash
npm run build
cd dist && git init -b gh-pages && git add -A && git commit -m "Deploy" \
  && git push -f <repo-url> gh-pages
```

## Notes

- The tax screen is an estimate for salary income (Section 40(1)) using tax-year-2568 rates and caps; always verify with the Revenue Department before filing.
- Browsers may evict IndexedDB storage for sites you haven't visited in a while. Installing the app and granting persistent storage (Settings → request persistent storage) greatly reduces that risk — and export a JSON backup regularly.
