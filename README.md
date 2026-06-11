# Pocketo（ポケット）

Minimal Japanese-inspired income & expense tracker — an installable PWA with kakeibo-style reports, money pockets with auto-allocation, and a Thai personal income tax estimator. All data stays on your device.

**Live app:** https://tasachii.github.io/pocketo/ · **Project details, architecture & class diagram:** [DESCRIPTION.md](DESCRIPTION.md)

| | | |
|---|---|---|
| ![Home dark](docs/screenshots/home-dark.png) | ![Reports](docs/screenshots/reports.png) | ![Pockets](docs/screenshots/pockets.png) |

---

## Project Description

Pocketo is a digital *kakeibo* (Japanese household account book). Log a transaction in 3 taps, split incoming money into purpose-driven pockets automatically (savings / investing / travel), keep budgets per category, set up weekly/monthly/yearly recurring items, and estimate your Thai income tax from what you actually logged — bracket by bracket, with a "buy X more SSF/RMF, save Y" simulator.

It is a static web app: no server, no account, no tracking. Everything lives in your browser's IndexedDB (money stored as integer satang, balances always derived from the transaction log) and works fully offline once loaded. Deletes are undo-able, backups are portable JSON, and the monthly summary can be shared as a PNG card.

- Stack: React 18 · TypeScript (strict) · Vite · Tailwind CSS · Dexie (IndexedDB) · vite-plugin-pwa
- No chart library, no UI kit — charts are hand-rolled SVG; JS bundle ≈ 100 KB gzip
- Tested with 72 unit tests (Vitest) on the pure engines and 8 end-to-end tests (Playwright)

---

## Installation (use it as an app)

No install step is needed — it's a web app:

1. Open **https://tasachii.github.io/pocketo/**
2. - **iPhone/iPad (Safari):** Share button → **Add to Home Screen**
   - **Android (Chrome):** ⋮ menu → **Install app**
   - **Desktop (Chrome/Edge):** install icon in the address bar
3. Optional but recommended: Settings → request persistent storage, and export a JSON backup now and then.

## Running locally

Requires **Node.js 18+** and Git. Same commands on macOS (Terminal) and Windows (PowerShell/CMD); install Node from https://nodejs.org if needed.

```sh
git clone https://github.com/Tasachii/pocketo.git
cd pocketo
npm install
npm run dev        # → http://localhost:5173
```

Other scripts:

```sh
npm test           # unit tests (Vitest, 72 tests)
npm run test:e2e   # end-to-end tests (Playwright; first time: npx playwright install chromium)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build (http://localhost:4173/pocketo/)
npm run icons      # regenerate PWA icons (zero-dependency PNG writer)
node scripts/capture-screens.mjs   # regenerate doc screenshots (dev server on :5201 required)
```

---

## Tutorial / Usage

**Log an expense (3 taps).** Tap the vermilion **+** button → type the amount on the keypad → **ถัดไป** → tap a category. It saves instantly (you'll see a red seal stamp). Note, date, and pocket are optional tweaks on the same screen.

**Log income.** Same flow, but switch the toggle to **รายรับ**. If income goes into the main pocket and you've set allocation rules, it is split into your pockets automatically.

**Pockets (กล่องเงิน tab).** Create pockets with **+**; give each a saving goal (drawn as an ink-circle ring) and/or an auto-allocation percent (e.g. 20% of every income). Transfer between pockets with the ⇄ button. Tap a pocket to edit or delete it.

**Budgets.** Settings → tap a category → set a monthly budget. The Reports tab then shows a progress bar that turns amber at 80% and red past 100%.

**Recurring transactions.** Settings → รายการประจำ → add salary, rent, subscriptions on a weekly / monthly / yearly schedule. Due items are posted automatically when you open the app (missed periods are caught up); upcoming ones appear on the home screen. Toggle a rule off any time.

**History & editing.** Home → **ทั้งหมด →** opens the full history: search by category/note/amount/pocket, filter by type, tap any row to edit. Deleting shows a 5-second undo; deleting an auto-allocated income removes its linked transfers too, and undo restores the whole set.

**Tax (ภาษี tab).** Pull your logged yearly income with one tap (or type it), add withholding tax and deductions — caps are enforced and explained — and read the bracket-by-bracket result, refund/amount due, and marginal savings for extra deductions.

**Reports & sharing.** Browse months with ◀ ▶; the share icon renders the month (net, top categories, kakeibo pillars) into a PNG card you can share or download.

**Backup.** Settings → export writes a JSON file; import restores it (replaces everything, with confirmation). A banner reminds you if you haven't exported for 30 days.

**Theme.** The icon at the top-right of Home cycles dark → light → system. Dark is the default.
