# Mabi Tracker

A Mabinogi-themed income ledger. Search items on the [Mabinogi World Wiki](https://wiki.mabinogiworld.com/view/Wiki_Home), log unit price and quantity, and track daily profit after the **4% market tax**. Everything is stored in `localStorage` so progress persists in the browser.

## Features

- Live wiki item search via the MediaWiki API
- Per-entry price × amount with tax applied after gross
- Daily net profit chart
- Local cache (no account / no backend)

## Live site

https://mistgg.github.io/mabi-tracking/

One-time setup: in [Pages settings](https://github.com/MistGG/mabi-tracking/settings/pages), set **Source** to **Deploy from a branch**, branch **gh-pages** / **/ (root)**, then Save.


## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

Pushes to `master` deploy automatically via GitHub Pages.
