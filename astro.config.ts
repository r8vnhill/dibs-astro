import tailwindcss from "@tailwindcss/vite";
import { defineConfig, sharpImageService } from "astro/config";
import { devServerFileWatcher } from "./config/integrations/dev-server-file-watcher";
import { generateIconsIntegration } from "./config/integrations/generate-icons";
import "./config/shiki-warn-tracker";

import react from "@astrojs/react";

const isVitestRun = process.env.VITEST === "true";

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
 * - `./config/shiki-warn-tracker` suppresses redundant Shiki warnings and keeps Astro's internal
 *   markdown-Shiki runtime patch enabled for builds. The runtime patch stays off by default in
 *   local development to avoid `vite:invoke fetchModule` transport stalls during cold starts.
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
        ...(
            isVitestRun
                ? []
                : [
                    // Custom plugin to trigger HMR when specific files change
                    devServerFileWatcher([
                        "./config/**", // Watch all custom integration and plugin files
                        "./src/assets/**", // Watch all assets for changes
                        "./src/data/**", // Watch all data files for changes
                    ]),
                ]
        ),
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
