# Changelog

All notable changes to Pocketo are documented here.
This project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-06-11

First public version.

### Core
- 3-tap expense/income logging stored as integer satang (no float drift)
- Money pockets: saving goals (ensō ring), transfers, opening balances, and
  percentage-based automatic allocation of income (largest-remainder split)
- Kakeibo reports: four-pillar breakdown, category donut, 6-month trend
- Per-category monthly budgets with threshold coloring
- Recurring transactions (weekly / monthly / yearly) with catch-up posting for
  periods the app was closed
- Thai personal income tax estimator: 8 progressive brackets, expense
  deduction, allowance caps (SSF/RMF/Thai ESG/PVD/insurance/social security/
  home-loan/donation), withholding-tax refund, and a marginal-savings simulator
- Full transaction history with search, filter, and editing
- Undo-able deletes; deleting an auto-allocated income removes its linked
  transfers, and undo restores the whole set

### Data & privacy
- Local-first: all data in IndexedDB, no server, no account, no tracking
- JSON backup export/import, with optional AES-GCM password encryption
- Backup reminder after 30 days; persistent-storage request

### Experience
- First-run onboarding (3 cards + install hint)
- Dark / light / system themes — all text meets WCAG 2.1 AA contrast (verified
  by an automated axe audit), except the vermilion brand accent (documented)
- Installable PWA, fully offline (web fonts runtime-cached)
- Shareable 1080×1350 monthly summary card
- Open Graph / Twitter preview image for shared links

### Quality
- 77 unit tests (Vitest) on the pure engines
- 11 end-to-end + accessibility tests (Playwright) run against a production build
