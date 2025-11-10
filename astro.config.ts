import { defineConfig, sharpImageService } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { devServerFileWatcher } from "./config/integrations/dev-server-file-watcher";
import { generateIconsIntegration } from "./config/integrations/generate-icons";
import "./config/shiki-warn-tracker";

import react from "@astrojs/react";

/**
 * DIBS Astro configuration (concise):
 * - site, trailingSlash and static output for a static-site deployment
 * - React integration for client islands
 * - Tailwind via Vite and Sharp for image transforms
 * - Dev file watcher for HMR on config/assets/data changes
 *
 * Notes:
 * - Code highlighting is implemented by local Shiki helpers; Astro's Markdown highlighting is set
 *   to Prism to avoid the built-in Shiki instantiation during markdown processing.
 * - `./config/shiki-warn-tracker` is imported for an early runtime patch that suppresses redundant
 *   Shiki warnings and applies a small cache for the markdown-remark highlighter.
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
    generateIconsIntegration(),
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
