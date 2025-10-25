import { defineConfig, sharpImageService } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { devServerFileWatcher } from "./config/integrations/dev-server-file-watcher";
import "./config/shiki-warn-tracker";

import react from "@astrojs/react";

/**
 * Astro configuration for the DIBS site.
 *
 * This setup includes:
 * - React for interactive UI components.
 * - TailwindCSS for utility-first styling.
 * - Sharp image service for image optimization during build time.
 * - A custom dev server watcher to reload when config files change.
 */
export default defineConfig({
  // Used to generate correct absolute URLs during build
  site: "https://dibs.ravenhill.cl",

  // Ensures that all routes have trailing slashes (e.g., /page/ instead of /page)
  trailingSlash: "always",

  // Enables full static prerendering of the site
  output: "static",

  // Disable Astro's bundled Shiki instance; custom components handle highlighting
  markdown: {
    syntaxHighlight: "prism",
  },

  integrations: [
    // Custom plugin to trigger HMR when specific files change
    devServerFileWatcher([
      "./config/**", // Watch all custom integration and plugin files
      "./src/assets/**", // Watch all assets for changes
      "./src/data/**", // Watch all data files for changes
    ]),
    react(),
  ],

  vite: {
    plugins: [
      // Enables TailwindCSS within the Vite build pipeline
      tailwindcss(),
    ],
  },

  image: {
    // Use sharp for image transformations during build (prerendered only)
    service: sharpImageService(),
  },
});
