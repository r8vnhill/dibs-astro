import { defineConfig, sharpImageService } from "astro/config";
import preact from "@astrojs/preact";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { devServerFileWatcher } from "./config/integrations/dev-server-file-watcher";

/**
 * Astro configuration for the DIBS site.
 *
 * This setup includes:
 * - Preact for interactive UI components.
 * - TailwindCSS for utility-first styling.
 * - Cloudflare as the deployment adapter.
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

  integrations: [
    // Custom plugin to trigger HMR when specific files change
    devServerFileWatcher([
      "./config/**", // Watch all custom integration and plugin files
    ]),

    // Adds Preact support to render UI components with lightweight runtime
    preact(),
  ],

  vite: {
    plugins: [
      // Enables TailwindCSS within the Vite build pipeline
      tailwindcss(),
    ],
  },

  // Cloudflare adapter to deploy as a Cloudflare Pages Worker
  adapter: cloudflare(),

  image: {
    // Use sharp for image transformations during build (prerendered only)
    service: sharpImageService(),
  },
});
