# Pocketo — Project Guide

This is the one document to read to understand the whole project: what Pocketo is, how the
repository is laid out, how every piece of code works, how data flows end to end, and how to
develop, test, and extend it. It complements the other docs rather than replacing them:

| Document | What it covers |
|---|---|
| [`README.md`](README.md) | User-facing overview, installation, usage |
| [`DESCRIPTION.md`](DESCRIPTION.md) | Project concept, objectives, class diagram, statistics |
| [`PRIVACY.md`](PRIVACY.md) | What data is stored and where (nothing leaves the device) |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history |
| **This file** | How the code actually works, file by file |

---

## 1. What Pocketo is

Pocketo（ポケット）is a **local-first personal finance app** delivered as an installable
Progressive Web App. It is a digital *kakeibo* (家計簿, the Japanese household account book):
you log income and expenses, split incoming money into purpose-driven **pockets**, keep
budgets, schedule **recurring** transactions, and estimate your **Thai personal income tax**
from what you actually logged.

There is **no backend**. The entire app is static files; all data lives in the browser's
IndexedDB on the user's device. It works fully offline after the first load and can be
installed to the home screen without an app store.

```
Browser (React UI)
   │  reactive reads (Dexie liveQuery)        writes (services)
   ▼                                            │
src/core/*  ── pure engines (money, tax, allocate, recurring, backup, crypto, share)
   ▲                                            ▼
   └────────────── src/db (PocketoDB = Dexie over IndexedDB) ──────────────┘
```

The guiding principle: **correctness-critical logic is pure and isolated.** Everything that
must never be wrong — money arithmetic, tax brackets, allocation splits, recurring schedules —
lives in `src/core/` as pure functions with no I/O, fully unit-tested. The database layer and
React components build on top of that core but never reimplement its rules.

## 2. Repository map

A single-package Vite + React + TypeScript app (not a monorepo):

```
pocketo/
├── index.html                  # Vite entry; <head> has PWA + Open Graph meta
├── vite.config.ts              # React plugin, PWA plugin (+ font runtime-cache), Vitest config
├── tailwind.config.js          # design tokens mapped to CSS variables; darkMode: 'class'
├── playwright.config.ts        # e2e config — runs against a production preview build
├── package.json                # scripts: dev / build / test / test:e2e / icons / og
│
├── scripts/
│   ├── gen-icons.mjs           # writes PWA icons as PNG (zlib + raw chunks, zero deps)
│   ├── gen-og.mjs              # renders the 1200×630 Open Graph image via Playwright
│   └── capture-screens.mjs     # seeds demo data through the real UI, captures doc screenshots
│
├── src/
│   ├── main.tsx                # React root + service-worker registration
│   ├── App.tsx                 # tab shell, FAB, onboarding gate, global overlays
│   ├── styles.css              # Tailwind layers + the colour token palette (washi / sumi)
│   │
│   ├── core/                   # PURE engines — no React, no I/O, all unit-tested
│   │   ├── types.ts            # domain entities: Tx, Pocket, Category, Recurring
│   │   ├── money.ts            # satang arithmetic, parse/format
│   │   ├── allocate.ts         # splitByPercent — largest-remainder, satang-exact
│   │   ├── tax.ts              # Thai PIT engine + per-tax-year config
│   │   ├── recurring.ts        # due-date engine (weekly/monthly/yearly, clamping, catch-up)
│   │   ├── backup.ts           # versioned JSON export/import
│   │   ├── crypto.ts           # AES-GCM password encryption for backups
│   │   └── share.ts            # canvas renderer for the monthly summary PNG
│   │
│   ├── db/
│   │   ├── db.ts               # PocketoDB (Dexie subclass), schema versions, seed data
│   │   └── data.ts             # application services + date helpers
│   │
│   ├── state/
│   │   └── useTheme.ts         # dark / light / system theme hook
│   │
│   ├── components/
│   │   ├── TabBar.tsx          # bottom navigation
│   │   ├── QuickAdd.tsx        # 3-tap add flow (keypad → category)
│   │   ├── TxEditor.tsx        # edit / delete a transaction (with undo)
│   │   ├── RecurringManager.tsx# list + dialog for recurring rules
│   │   ├── Onboarding.tsx      # first-run welcome cards
│   │   ├── Feedback.tsx        # global confirm / prompt dialogs + undo toasts
│   │   ├── Modal.tsx           # shared Overlay / Field / input styles
│   │   ├── EnsoRing.tsx        # ink-circle progress ring
│   │   ├── NumberTicker.tsx    # animated counting balance
│   │   ├── Donut.tsx           # SVG donut chart + chart palette
│   │   ├── Stamp.tsx           # hanko-style "saved" stamp
│   │   └── Icons.tsx           # inline SVG icon set
│   │
│   └── screens/
│       ├── Home.tsx            # balance, pockets strip, upcoming, recent, backup nudge
│       ├── Pockets.tsx         # pocket cards, create/edit dialog, transfer dialog
│       ├── Reports.tsx         # month nav, budgets, donut, pillars, trend, share
│       ├── Tax.tsx             # tax form + bracket breakdown + simulator
│       ├── History.tsx         # full searchable/filterable transaction list
│       └── Settings.tsx        # theme, backup, recurring, categories, about
│
├── docs/screenshots/           # PNGs used by the docs (generated)
└── e2e/
    ├── app.spec.ts             # end-to-end flows
    └── a11y.spec.ts            # automated WCAG audit (axe-core)
```

## 3. Data model

All entities are TypeScript interfaces in `src/core/types.ts`; the tables are declared in
`src/db/db.ts`. Money is stored as integer **satang** (1 baht = 100 satang) everywhere.

### `tx` — transactions

| Field | Meaning |
|---|---|
| `id` | auto-increment |
| `type` | `IN` (income) \| `OUT` (expense) \| `TRANSFER` (between pockets) \| `INIT` (opening balance) |
| `amount` | satang, always positive — direction comes from `type` |
| `pocketId` | the pocket it belongs to (source pocket for a TRANSFER) |
| `toPocketId` | destination pocket, for TRANSFER only |
| `categoryId` | category, for IN/OUT |
| `parentId` | for an auto-allocation TRANSFER, points back to the income that created it |
| `note` | optional free text |
| `date` | ISO `YYYY-MM-DD` |
| `createdAt` | epoch ms, for stable ordering within a day |

Indexed on `date, type, pocketId, categoryId`.

### `pockets`

`name, icon, isMain (0|1), goal? (satang), allocPercent? (0–100), sortOrder`. Exactly one
pocket is the **main** pocket (income lands there by default). A pocket's balance is **never
stored** — it is always derived from the transaction log (see §7.2).

### `categories`

`name, icon, type ('income'|'expense'), group? (needs|wants|culture|extra), budget? (satang),
sortOrder`. The `group` is the kakeibo pillar (expenses only); `budget` is an optional monthly
cap.

### `recurring`

`type, amount, pocketId, categoryId?, note?, freq? (monthly|weekly|yearly), day, month?,
since, lastPosted?, active (0|1), createdAt`. For monthly/yearly, `day` is a day-of-month
(1–31, clamped in short months); for weekly, `day` is a day-of-week (0–6). `since` and
`lastPosted` bound which occurrences have been posted.

### `kv`

A tiny key-value table (`key` PK, `value`) for app state that *does* belong with the data:
the `seeded` flag, the `lastExport` timestamp, the per-year tax form drafts (`tax-2569`).
Device-only UI flags that should **not** travel in a backup (theme, onboarding-seen) live in
`localStorage` instead — see §7.4.

All amounts are integer satang and all dates are ISO strings, so lexicographic comparison on
dates is chronological (plain `<` / `startsWith(month)` work).

## 4. The core engines (`src/core`) — pure, tested, no I/O

### `money.ts`
`bahtToSatang` / `satangToBaht`, `parseAmount(text)` (accepts `"1,250.50"`, rejects junk and
more than 2 decimals, returns satang or null), and `fmt` / `fmtBaht` formatting that drops a
trailing `.00` and uses a real minus sign. Storing satang as integers is why `0.1 + 0.2`
can never drift.

### `allocate.ts`
`splitByPercent(amount, rules)` divides an income amount across pockets by percentage using
the **largest-remainder method**: floor each share, then hand out the leftover satang to the
largest fractional remainders. This guarantees the split sums to exactly
`round(amount × Σpercent / 100)` — no satang invented or lost. Throws if percentages exceed 100.

### `tax.ts`
The Thai personal income tax engine. `TAX_YEAR_2568` is a **config object** holding the
bracket table and every allowance cap as data, so a new tax year is a config change, not a
code change. `calcThaiTax(input, config)`:
1. standard expense deduction (50%, capped at 100,000);
2. allowances with per-item caps, the combined life+health insurance cap, and the combined
   500,000 retirement cap (SSF + RMF + PVD), trimming deterministically when exceeded;
3. donation capped at 10% of income-after-deductions;
4. `progressiveTax` over the brackets;
5. subtract withholding tax → `finalTax` (≥0) **and** `taxRefund` (≥0) as separate fields,
   never a negative number.

It returns a full breakdown (per-bracket tax, effective rate, applied allowances, human-
readable cap notes). `savingIfDeductMore` and `marginalRate` power the "buy X more, save Y"
simulator.

### `recurring.ts`
`dueDates(rule, today)` returns every occurrence that should be posted but hasn't, between
`since`/`lastPosted` and today inclusive — for weekly, monthly, or yearly frequency, with
short-month/leap-year clamping (a "31st" rule fires on Feb 28/29). `nextOccurrence` finds the
next future date for the "upcoming" UI. Both are pure date math; `applyDueRecurring` in the db
layer is what actually writes the rows.

### `backup.ts`
`exportData` collects all tables into a versioned `BackupFile` (schemaVersion 2; import still
accepts v1 files that predate recurring). `importData` validates and replaces everything
inside one transaction (atomic — a bad file leaves existing data untouched). `downloadBackup`
writes the file and, if given a passphrase, encrypts it first.

### `crypto.ts`
`encryptBackup` / `decryptBackup` using Web Crypto: a passphrase is stretched with PBKDF2
(150k iterations, SHA-256) into an AES-GCM 256 key; salt and IV are random per export. AES-GCM
authentication means a wrong passphrase fails cleanly instead of returning garbage. Works in
the browser and under Node 20+ (so it is unit-tested with real crypto).

### `share.ts`
`renderShareCard(data)` draws a 1080×1350 PNG of the month (net, top categories, kakeibo
pillars) onto a `<canvas>` in the sumi theme and returns a Blob. No image assets — everything
is drawn.

## 5. The data layer (`src/db`)

### `db.ts`
`PocketoDB extends Dexie` declares the tables across **two schema versions** (v1 = core
tables; v2 adds `recurring`). Versions are append-only — existing databases run only the new
migration. `seedIfEmpty` populates the default pocket and ~15 Thai categories on first run,
guarded by the `seeded` kv flag so it never overwrites a user who later deletes things.

### `data.ts`
The application services — the only place that mutates data and the only place that knows the
business rules that need the database:

- `calcBalances(pockets, txs)` folds the transaction log into per-pocket balances (the single
  source of truth for any balance shown).
- `saveQuickTx` inserts a transaction and, if it is income into the main pocket, creates the
  auto-allocation transfers — each tagged with `parentId` pointing back to the income.
- `deleteTxCascade` removes a transaction and, for an income, its linked allocation transfers,
  returning the deleted rows so `restoreTxs` can undo the whole set.
- `updateTx` edits a transaction and, if an allocated income's amount/date/pocket changed,
  recomputes its allocations so pocket balances stay correct.
- `applyDueRecurring(today)` posts every due occurrence of every active rule (via the same
  `saveQuickTx`, so recurring income is auto-allocated too) and advances `lastPosted`. It is
  idempotent — called on every app launch, it catches up missed months exactly once.
- `transfer` moves money between pockets; plus Thai date helpers (`THAI_MONTHS`,
  `fmtThaiDate`, `monthKey`, `todayStr`).

## 6. The UI (`src/components`, `src/screens`)

### Shell — `App.tsx`
Holds the active tab, renders the five screens, the floating **+** button (hidden on Tax and
Settings), the global `<Feedback/>` (dialogs + toasts), the "saved" `<Stamp/>`, and the
first-run `<Onboarding/>`. On mount it runs `seedIfEmpty().then(applyDueRecurring)`. The
onboarding gate reads `localStorage` synchronously (see §7.4) so it never flashes.

### Reactive data — `dexie-react-hooks`
Screens read with `useLiveQuery(() => db.<table>...)`, which re-renders automatically whenever
the underlying tables change. Writes go through the `data.ts` services, and every open screen
updates at once — there is no manual cache or refresh.

### Screens
- **Home** — animated total balance (`NumberTicker`), a horizontal pocket strip with ensō
  goal rings, "upcoming" recurring items, the recent list (tap a row to edit), and a backup
  reminder banner that appears after 30 days without an export.
- **Pockets** — pocket cards with goal rings; a create/edit dialog (name, icon, goal,
  auto-allocation %, opening balance) and a transfer dialog with balance validation.
- **Reports** — month navigator, per-category budgets (green→amber→red), category donut,
  the four kakeibo pillars, a 6-month trend, and the share-to-PNG button. It queries only a
  6-month window via the `date` index rather than the whole table (see §7.3).
- **Tax** — the deductions form (drafts saved per year in `kv`), a "pull my logged income"
  button, the bracket-by-bracket result with refund/amount-due, and the savings simulator.
- **History** — every transaction, grouped by month, with text search, type filters, paged
  loading, and tap-to-edit.
- **Settings** — theme switch, backup export/import (with the optional-password flow),
  recurring rules, category management (edit, budget, kakeibo group), storage controls, and
  the about/install section.

### Shared components
`Feedback.tsx` is a small module-level store exposing `confirmDialog`, `promptDialog`, and
`showToast` (with a 5-second undo) — used app-wide instead of the browser's `confirm`/`prompt`
so every dialog matches the app's look. `Modal.tsx` provides the shared `Overlay`/`Field`
primitives. `EnsoRing`, `NumberTicker`, `Donut`, and `Stamp` are the signature visual pieces;
`Icons.tsx` is the inline SVG set (no icon font).

### Look — `styles.css` + `tailwind.config.js`
Colours are CSS variables themed by a `dark` class on `<html>`: a warm **washi** paper light
theme and a **sumi** ink dark theme (default), with a vermilion accent and traditional
Japanese names. Tailwind maps tokens (`bg-surface`, `text-sub`, …) to those variables. Every
text colour is tuned to meet WCAG AA contrast (see DESCRIPTION §7).

## 7. Cross-cutting design decisions

### 7.1 Money is integer satang
Floating-point baht drifts; integers don't. Amounts are parsed to satang at the input edge,
stored and computed as integers, and only formatted back to baht for display.

### 7.2 Balances are derived, never stored
A pocket has no balance column. `calcBalances` folds the transaction log every time. A balance
therefore can never disagree with its history, and undo/edit/delete need no balance bookkeeping
— they just change transactions.

### 7.3 Auto-allocation is linked by `parentId`
When income enters the main pocket, the generated transfers carry `parentId` = the income's id.
That one link makes the hard cases correct: editing the income re-splits the transfers, deleting
it cascades to them, and undo restores the exact set.

### 7.4 Right storage for each fact
Data that belongs to the user (transactions, pockets, settings drafts) lives in IndexedDB and
travels in backups. Device-only UI flags (theme, "seen onboarding") live in **localStorage**,
which is synchronous — so the onboarding gate is decided on the very first render with no async
read racing Dexie's database open. (An earlier IndexedDB-based gate was intermittently showing
the welcome screen again after a reload; localStorage removed the race entirely.)

### 7.5 Queries are scoped where the screen allows
Most screens need all data (balances are all-time), but Reports only ever shows a 6-month
window, so it queries that range through the `date` index instead of loading the whole table.

## 8. End-to-end walkthroughs

**Log an expense (3 taps).** FAB → type amount on the keypad → "next" → tap a category.
`saveQuickTx` inserts one `OUT` row; `useLiveQuery` updates Home instantly; a hanko stamp
animates. Note/date/pocket are optional on the same screen.

**Salary arrives, split automatically.** You set "ออม" to 20% allocation. You log 38,000
income into the main pocket → `saveQuickTx` inserts the `IN` row, then `splitByPercent` yields
a 20% share and a `TRANSFER` row (parentId = the income) moves it to "ออม". Pockets and Home
reflect both immediately. Delete the income later and the transfer goes with it; undo brings
both back.

**A month you didn't open the app.** You have a monthly salary rule since March; you open the
app in June. `applyDueRecurring` computes the missed April/May/June occurrences via `dueDates`,
posts each once (auto-allocating as above), and sets `lastPosted` so reopening posts nothing
new.

**Estimate tax.** Tax tab → "pull logged income" sums your `IN` rows for the year → you add
deductions (caps enforced, with notes) → `calcThaiTax` returns the bracket breakdown, refund or
amount due, and the simulator shows what another 10k/50k/100k of SSF would save.

**Encrypted backup, moved to a new phone.** Settings → export → choose a password →
`encryptBackup` (PBKDF2 + AES-GCM) writes an encrypted JSON. On the new device, import → enter
the password → `decryptBackup` → `importData` replaces everything atomically.

## 9. Developing, testing, releasing

```bash
npm install
npm run dev        # Vite dev server (http://localhost:5173)
npm test           # unit tests (Vitest) — the core engines
npm run test:e2e   # Playwright e2e + a11y, against a production preview build
npm run build      # type-check (tsc) + production build into dist/
npm run preview    # serve the production build at /Pocketo/
npm run icons      # regenerate PWA icons
npm run og         # regenerate the Open Graph image
node scripts/capture-screens.mjs   # regenerate doc screenshots (dev server on :5201)
```

**Testing strategy.** The pure engines carry the correctness weight and are exhaustively
unit-tested (every tax bracket boundary and cap, satang-exact splits, recurring schedules
across short months / leap years / missed periods, backup round-trips including encryption and
v1 files, cascade delete/restore, allocation re-split). The Playwright suite drives the real UI
for the main flows and runs an **axe** accessibility audit on every screen in both themes;
crucially it runs against a production preview (not the dev server) so there is no StrictMode
double-invoke or HMR flakiness. Service workers are blocked during e2e so reload-persistence
assertions are deterministic.

**Deploy.** The app is static. `npm run build` produces `dist/` with base path `/Pocketo/`;
it is published to GitHub Pages.

## 10. How to extend it

- **New screen/tab**: add `src/screens/X.tsx`, render it in `App.tsx`, and add a tab to
  `TabBar.tsx`. Read with `useLiveQuery`; write through a `data.ts` service.
- **New persisted field**: add it to the interface in `core/types.ts`. If it needs an index,
  bump the Dexie schema with a **new** `this.version(n)` in `db.ts` — never edit an applied
  version. Add it to `backup.ts` (and bump `schemaVersion`, keeping import back-compatible).
- **New engine rule**: put it in `src/core/` as a pure function with a `.test.ts` beside it;
  call it from a `data.ts` service or a component.
- **New tax year**: add a `TAX_YEAR_xxxx` config object in `tax.ts` — no logic changes.

Planned next (see README): opt-in encrypted cross-device sync, tax phase 2 (family allowances,
non-salary income), bank-statement CSV import, English locale.
