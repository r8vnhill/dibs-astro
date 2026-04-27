import tailwindcss from "@tailwindcss/vite";
import { defineConfig, sharpImageService } from "astro/config";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { devServerFileWatcher } from "./config/integrations/dev-server-file-watcher";
import { generateIconsIntegration } from "./config/integrations/generate-icons";
import "./config/shiki-warn-tracker";

import react from "@astrojs/react";

const isVitestRun = process.env.VITEST === "true";
const scriptingPagesDir = "./src/pages/notes/scripting";

function walkAstroPages(dir: string): string[] {
    return readdirSync(dir)
        .flatMap((entry) => {
            const entryPath = join(dir, entry);
            const stats = statSync(entryPath);
            if (stats.isDirectory()) {
                if (entry.startsWith("__")) {
                    return [];
                }
                return walkAstroPages(entryPath);
            }
            return entryPath.endsWith(".astro") ? [entryPath] : [];
        });
}

function pageFileToRoute(filePath: string): string {
    const filePathFromRoot = relative("src/pages", filePath).replaceAll("\\", "/");
    const withoutExtension = filePathFromRoot.slice(0, -".astro".length);
    const routePath = withoutExtension.endsWith("/index")
        ? withoutExtension.slice(0, -"/index".length)
        : withoutExtension;

    return `/${routePath}/`;
}

function buildLegacyScriptingRedirects(): Record<string, string> {
    return Object.fromEntries(
        walkAstroPages(scriptingPagesDir)
            .map((filePath) => pageFileToRoute(filePath))
            .map((newRoute) => [
                newRoute.replace("/notes/scripting/", "/notes/software-libraries/scripting/"),
                newRoute,
            ]),
    );
}

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
 * - `./config/shiki-warn-tracker` suppresses redundant Shiki warnings only.
 */
export default defineConfig({
    // Used to generate correct absolute URLs during build
    site: "https://dibs.ravenhill.cl",

    // Ensures that all routes have trailing slashes (e.g., /page/ instead of /page)
    trailingSlash: "always",

    // Enables full static prerendering of the site
    output: "static",

    redirects: buildLegacyScriptingRedirects(),

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
