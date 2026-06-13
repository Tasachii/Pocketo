# Contributing to Pocketo

This is the handoff document. If you are going to change the code, **read this first** — it
captures the conventions and the non-obvious traps that you cannot see by reading the code
alone. It is the tribal knowledge.

Read order for a newcomer:
1. [`README.md`](README.md) — what the app does, how to run it.
2. [`PROJECT_GUIDE.md`](PROJECT_GUIDE.md) — how the code is laid out, file by file.
3. **This file** — the rules, the gotchas, and the recipes for common changes.
4. [`ROADMAP.md`](ROADMAP.md) — what to build next, with code pointers.
5. [`DESCRIPTION.md`](DESCRIPTION.md) — concept, class diagram, statistics.

---

## First 10 minutes

```bash
npm install
npm run dev          # http://localhost:5173 — live app
npm test             # 77 unit tests (Vitest) — the pure engines
npm run test:e2e     # 12 e2e + a11y tests (Playwright); first run: npx playwright install chromium
npm run build        # type-check (tsc, strict) + production build into dist/
```

Before you open a PR, all four must be green: `tsc`, `npm test`, `npm run build`,
`npm run test:e2e`. CI (`.github/workflows/ci.yml`) runs exactly these on every push, and a
merge to `main` auto-deploys to GitHub Pages (`.github/workflows/deploy.yml`). **Do not
force-push to a `gh-pages` branch** — that is the old method; Pages now builds from the
workflow.

---

## The 6 golden rules

1. **Correctness-critical logic is a pure function in `src/core/`, with a `.test.ts` beside
   it.** Money, tax, allocation, recurring dates, crypto. No React, no `db`, no I/O. This is
   what makes the test suite cheap and trustworthy. Never put this logic in a component.
2. **`src/core/` must not import from `src/i18n` or `src/db`.** The core is presentation- and
   storage-agnostic. If the core needs a translated string, it returns a *code* and the UI
   translates it (see the tax-notes gotcha below). If it needs data, it is passed in.
3. **Schema changes are append-only.** Add a new `this.version(n)` block in `src/db/db.ts` —
   never edit an applied version. If the change adds persisted data, also extend
   `src/core/backup.ts` and bump `schemaVersion`, keeping `importData` able to read older
   files.
4. **Money is integer satang; balances are derived.** Parse to satang at the input edge
   (`parseAmount`), compute as integers, format with `fmt`/`fmtBaht`. Never store a pocket
   balance — `calcBalances` folds the transaction log every time (see PROJECT_GUIDE §7.2).
5. **If you touch colours or markup, re-run `npm run test:e2e`.** It includes an axe
   accessibility audit. Every text colour must meet WCAG AA on the surface it sits on. The
   one allowed exception is the vermilion brand accent (documented below).
6. **i18n: every user-facing string goes through `t()`.** `src/i18n/th.ts` is the source of
   truth for keys; `en.ts` must define the exact same set. See the i18n gotchas.

---

## Gotchas — the hard-won lessons

These each cost real debugging time. Respect them.

### Onboarding gate lives in `localStorage`, not IndexedDB
`App.tsx` decides whether to show onboarding by reading `localStorage` **synchronously** on
first render (`ONBOARDED_KEY` in `Onboarding.tsx`). An earlier version gated on an IndexedDB
`kv` value via `useLiveQuery`; on reload that read *raced* Dexie's database open and
intermittently re-showed the welcome screen. **Rule:** device-local UI flags that must be
read on first paint (theme, onboarding-seen, language) belong in `localStorage`. Data that
belongs to the user and should travel in a backup belongs in IndexedDB.

### e2e runs against a *production preview*, not the dev server
`playwright.config.ts` builds and serves `npm run preview` (not `npm run dev`). Reasons:
no React StrictMode double-invoke, no HMR/on-the-fly transform flakiness, deterministic.
Service workers are **blocked** in the Playwright context (`serviceWorkers: "block"`) so
reload-persistence assertions don't race the PWA SW. The base path in preview is `/Pocketo/`,
so `baseURL` includes it.

### e2e assumes the default language is Thai
`initialLang()` in `src/i18n/index.ts` defaults to `th`. The e2e tests locate elements by
Thai text/labels. If you ever change the default language (or add browser-language
detection), you must update every e2e selector, or the suite breaks. There is one test that
switches to English and back — keep it working.

### The `t` vs `tx` shadowing trap
The translator is conventionally `const { t } = useT()`. Several screens also loop over
transactions. **Do not name the loop variable `t`** — it shadows the translator and any
`t("key")` inside the loop calls the transaction. Name it `tx`. (This was a real `tsc` error
in `Feedback.tsx` where a toast was named `t`.)

### Tax engine returns note *codes*, not strings
`calcThaiTax` returns `notes: TaxNote[]` where each note is `{ code, ... }` (e.g.
`{ code: "cap", field: "ssf", max: 144000 }`). The core does not know about language. `Tax.tsx`
translates them via `FIELD_LABEL` + `t("tax_cap", ...)`. If you add a deduction cap, add the
note code in `tax.ts` and the translation in `Tax.tsx` + both dictionaries.

### The share card receives translated labels
`src/core/share.ts` draws the PNG but is i18n-free: `renderShareCard(data)` takes
`data.labels` (balance / top / pillars / per-pillar names) that `Reports.tsx` fills with
`t(...)`. Don't import dictionaries into `core/`.

### Default category names stay Thai in both languages
They are seeded **user data** (`DEFAULT_CATEGORIES` in `db.ts`), not UI strings, so switching
to English does not rename them — by design. Only the kakeibo *group* label is translated.
Translating the seed names would need a migration or a "name is a key until edited" scheme
(noted in ROADMAP).

### Dates and the tax year are locale-aware
Use `useT()`'s helpers: `t.month(i)`, `t.shortMonth(i)`, `t.weekday(i)`, `t.date(iso)`,
`t.year(gregorian)`, `t.monthYear(y, m0)`. Thai shows the Buddhist era (`+543`), English shows
Gregorian. Do **not** hard-code `+ 543` or month arrays in components anymore.

### Auto-allocation transfers are linked by `parentId`
When income enters the main pocket, `saveQuickTx` creates `TRANSFER` rows tagged with
`parentId` = the income's id. This is what makes edit/delete correct: `deleteTxCascade` and
`updateTx` use it to remove or re-split the linked transfers. If you add another kind of
derived transaction, follow the same linking pattern.

### Brand accent is a *documented* AA exception
The vermilion accent (`#d9402f` / `#e84b3c`) on buttons and small highlights does not reach
4.5:1, only the 3:1 large-text / UI threshold. The a11y test (`e2e/a11y.spec.ts`) filters out
exactly these accent-coloured nodes and asserts everything else is clean. If you introduce a
new failing colour, it will fail the test — fix the colour, don't widen the filter.

---

## Recipes for common changes

**Add a user-facing string:** add a key to `src/i18n/th.ts`, the same key to `en.ts`, use
`const { t } = useT(); t("your_key")`. Keys must match across both files (CI's `tsc` won't
catch a missing key — it falls back to the key text at runtime, so check both).

**Add a new screen/tab:** create `src/screens/X.tsx`, render it in `App.tsx`, add a tab in
`TabBar.tsx`. Read with `useLiveQuery`, write through a `src/db/data.ts` service.

**Add a persisted field:** add it to the interface in `src/core/types.ts`; bump the Dexie
schema with a new `version(n)` in `db.ts` *only if it needs an index*; extend
`src/core/backup.ts` and its `schemaVersion`; add a test for the backup round-trip.

**Add a new tax year:** add a `TAX_YEAR_xxxx` config object in `src/core/tax.ts` — brackets and
caps are data. No logic changes. Add tests for the new boundaries.

**Add an engine/rule:** put it in `src/core/`, write the `.test.ts` first, then call it from a
`data.ts` service or a component.

---

## Testing model

- **Unit (Vitest, `src/**/*.test.ts`):** the pure engines carry the correctness weight —
  every tax bracket boundary and cap, satang-exact splits, recurring schedules across short
  months / leap years / missed periods, backup round-trips incl. encryption and v1 files,
  cascade delete/restore, allocation re-split. Fast, no DOM (some use `fake-indexeddb`).
- **e2e + a11y (Playwright, `e2e/*.spec.ts`):** real user flows on a production build, plus an
  axe audit of every screen in both themes. `vite.config.ts` restricts Vitest to
  `src/**/*.test.ts` so it never tries to run the Playwright `.spec.ts` files.

When a bug is found, add a test that would have caught it before fixing (every gotcha above
has one).

---

## Release / deploy

`main` is always deployable. Pushing to `main` triggers CI and, on success, the deploy
workflow builds `dist/` (base path `/Pocketo/`) and publishes it to GitHub Pages via
`actions/deploy-pages`. There is no manual deploy step. To preview a production build locally:
`npm run build && npm run preview` → http://localhost:4173/Pocketo/.

---

## Where everything is

```
src/core/      pure engines (money, allocate, tax, recurring, backup, crypto, share) + tests
src/db/        PocketoDB (Dexie) + data.ts application services
src/i18n/      th.ts (key source) + en.ts + useT() hook
src/state/     useTheme
src/components/ reusable UI (QuickAdd, TxEditor, RecurringManager, Onboarding, Feedback, …)
src/screens/   Home, Pockets, Reports, Tax, History, Settings
scripts/       gen-icons, gen-og, capture-screens (all run via npm scripts)
e2e/           app.spec.ts (flows) + a11y.spec.ts (axe)
.github/workflows/  ci.yml + deploy.yml
docs/screenshots/   generated by scripts/capture-screens.mjs (keep phone aspect, no fullPage)
```

When in doubt, `PROJECT_GUIDE.md` explains each file in prose.
