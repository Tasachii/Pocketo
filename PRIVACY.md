# Privacy

Pocketo is built so your financial data never leaves your device.

## What we collect

Nothing. There is no account, no sign-up, no server, and no analytics or
tracking of any kind. The app does not send your transactions, balances, tax
figures, or any other data anywhere.

## Where your data lives

- All your data (transactions, pockets, categories, budgets, recurring rules)
  is stored locally in your browser's **IndexedDB**, on your device only.
- A few small preferences (theme choice, whether you've seen the welcome
  screens, the last time you exported a backup) are stored in **localStorage**,
  also on your device only.
- The app is served as static files and, once loaded, works fully offline.

## What leaves your device, and only when you ask

- **Backup export** writes a file to wherever you choose to save it. If you set
  a password, the file is encrypted (AES-GCM) before it is written. Where that
  file then goes is up to you.
- **Share monthly card** creates an image and hands it to your device's share
  sheet (or downloads it). The app does not upload it anywhere.
- **Web fonts** are loaded from Google Fonts on first visit and then cached for
  offline use. This is the only third-party network request the app makes.

## Your control

You can export your data at any time, import it on another device, or delete
everything permanently from Settings. Because the data is local, clearing your
browser's site data (or uninstalling the app) erases it — keep a backup.
