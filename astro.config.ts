import { defineConfig, sharpImageService } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { devServerFileWatcher } from "./config/integrations/dev-server-file-watcher";

import expressiveCode from "astro-expressive-code";

import markdoc from "@astrojs/markdoc";
import flowbiteReact from "flowbite-react/plugin/astro";

import react from "@astrojs/react";

/**
 * Astro configuration for the DIBS site.
 *
 * This setup includes:
 * - React for interactive UI components.
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
    // Adds syntax highlighting and code formatting capabilities
    devServerFileWatcher([
      "./config/**", // Watch all custom integration and plugin files
      "./src/assets/**", // Watch all assets for changes
    ]),
    expressiveCode({
      themes: ["dracula", "solarized-light"],
      shiki: {},
    }),
    markdoc(),
    flowbiteReact(),
    react(),
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
