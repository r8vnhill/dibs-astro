import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { devServerFileWatcher } from './config/integrations/dev-server-file-watcher';

export default defineConfig({
  site: 'https://dibs.ravenhill.cl',
  trailingSlash: 'always',

  integrations: [
    devServerFileWatcher([
      './config/**', // Custom plugins and integrations
      './astro.sidebar.ts', // Sidebar configuration file
      './src/content/nav/*.ts', // Sidebar labels
    ]),
    preact(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
