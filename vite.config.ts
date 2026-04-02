import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PushQuest — Combats de Boss',
        short_name: 'PushQuest',
        description: 'Combats de boss avec de vraies pompes. Dark Souls meets Personal Trainer.',
        start_url: '/',
        theme_color: '#08080F',
        background_color: '#08080F',
        display: 'standalone',
        orientation: 'portrait',
        categories: ['fitness', 'games', 'health'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        screenshots: [
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', form_factor: 'narrow', label: 'PushQuest Home' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,json,wav,offline.html}'],
      },
    }),
  ],
});
