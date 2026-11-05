# Lifting Tracker

A personal weightlifting log that installs on an Android phone like a normal app.
It has no accounts and no backend. Everything is stored on the phone, and it works
fully offline once it has been opened.

**Live app:** https://16kingsi.github.io/lifting-tracker-app/

## Install it on a phone

1. Open the link above in Chrome on Android.
2. Open the Chrome menu (⋮) and tap **Add to Home screen**, then **Install**.
3. Open it from the home screen. It runs full screen, without the browser bar.

Each phone keeps its own separate data, so anyone can use the same link.

## Run it locally

You need [Node.js](https://nodejs.org) version 26 or newer (see `.nvmrc`).

```bash
npm install
```

```bash
npm run dev
```

Then open the address it prints. The page reloads when you save a file.

To test the real production build the way GitHub Pages serves it (from a
`/lifting-tracker-app/` subpath, with the service worker running):

```bash
npm run preview:subpath
```

Then open http://localhost:4173/lifting-tracker-app/.

To run the unit tests:

```bash
npm test
```

## Deploy

Push to the `main` branch. The workflow in `.github/workflows/deploy.yml` builds the
app and publishes it to GitHub Pages. You can watch it in the repo's **Actions** tab.

To host your own copy, fork the repo and set **Settings → Pages → Source** to
**GitHub Actions**. The workflow reads the repo name by itself, so nothing else needs
changing except the link at the top of this file.

## How the project is organized

| Path | What it is |
| --- | --- |
| `index.html` | The single page the app loads into |
| `src/main.tsx` | Starts the app and loads the fonts and styles |
| `src/App.tsx` | Picks which screen to show |
| `src/router.ts` | Tracks the current screen in the address (`#/workout`) |
| `src/types.ts` | The shape of everything the app stores |
| `src/lib/` | Plain logic with unit tests: weight conversion, pre-fill, rotation, formatting |
| `src/db/` | The database: schema and versions, starter routine, reads and writes |
| `src/components/` | Pieces shared between screens: icons, sheets, the lb/kg toggle |
| `src/screens/` | One folder per screen, each with its own CSS |
| `src/styles/` | Colours (`tokens.css`) and shared styles (`app.css`) |
| `public/icons/` | App icons |
| `vite.config.ts` | Build settings, plus the PWA manifest and service worker |
| `.github/workflows/deploy.yml` | Builds and deploys on every push to `main` |
| `package.json` | The project's dependencies and commands |
| `package-lock.json` | The exact version of every dependency |
| `.nvmrc` | The Node.js version this project uses |

## What each dependency is for

| Package | Purpose |
| --- | --- |
| `react`, `react-dom` | Builds the screens |
| `dexie`, `dexie-react-hooks` | Makes the browser's database (IndexedDB) easier to use, and refreshes screens when data changes |
| `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono` | Bundles the fonts so they work offline |
| `vitest` | Runs the unit tests (dev only) |
| `vite`, `@vitejs/plugin-react` | Dev server and production build (dev only) |
| `typescript`, `@types/react`, `@types/react-dom` | Type checking (dev only) |
| `vite-plugin-pwa` | Generates the service worker and manifest (dev only) |
