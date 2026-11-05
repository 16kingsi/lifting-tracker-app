import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The site's base path is not set here. GitHub Pages serves the app from
// /<repo-name>/, so the deploy workflow passes it with `vite build --base=...`.
// The PWA plugin reads the same value, and uses it for the manifest's start_url
// and scope and for the service worker's scope, so all of them stay in step.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      // The icons are already covered by globPatterns below.
      includeManifestIcons: false,
      workbox: {
        // Everything the app needs is saved on the phone at install, so it
        // works fully offline. Only .woff2 fonts: every Android Chrome reads them.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // A new version downloads in the background and takes over straight away,
        // but the open page never reloads itself, so an update can't interrupt a
        // workout. The new version shows the next time the app is opened.
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'Lifting Tracker',
        short_name: 'Lifting',
        description: 'A personal weightlifting log. All data stays on this phone.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0E1013',
        theme_color: '#0E1013',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
