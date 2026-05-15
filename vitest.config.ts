/// <reference types="vitest/config" />

import { getViteConfig } from "astro/config";
import { fileURLToPath } from "node:url";

// Ensure icon generation is skipped when Vitest loads Astro/Vite config in Node.
process.env.SKIP_ICON_GENERATION ??= "true";

/**
 * Vitest configuration used by the project.
 *
 * ## Notes:
 *
 * - We run tests in a jsdom environment because the site renders React components and many tests
 *   interact with DOM APIs (Testing Library + jsdom).
 * - `setupFiles` points to a small bootstrap that installs matchers (jest-dom) and any global test
 *   setup required by the suite.
 * - Test APIs are imported explicitly in every test file; `globals` stays disabled so suites do
 *   not rely on ambient `describe` / `test` / `expect`.
 * - `css: false` disables CSS processing/transforming within Vitest. The project styles are built
 *   by the real toolchain (Tailwind + Astro) and don't need to be processed during unit tests;
 *   disabling CSS speeds up test runs and avoids unrelated transform errors in jsdom.
 */
export default getViteConfig({
    resolve: {
        alias: {
            "@ravenhill/lesson-export-core": fileURLToPath(
                new URL("./packages/lesson-export-core/src/index.ts", import.meta.url),
            ),
            "@ravenhill/shiki-core": fileURLToPath(
                new URL("./packages/shiki-core/src/index.ts", import.meta.url),
            ),
        },
    },
    test: {
        // Run project unit tests under src, scripts, and workspace packages.
        include: [
            "src/**/__tests__/**/*.{test,spec}.{ts,tsx}",
            "scripts/**/__tests__/**/*.{test,spec}.{ts,tsx,js,mjs}",
            "packages/*/src/**/__tests__/**/*.{test,spec}.{ts,tsx}",
        ],

        // Use jsdom so DOM APIs (document/window) are available for React testing
        environment: "jsdom",

        // Run this file before the test suite to install helpers (e.g. jest-dom). Path is relative
        // to project root
        setupFiles: ["./src/test/setup.ts"],

        // Keep test APIs explicit in each file instead of relying on ambient globals.
        globals: false,

        // Clear and restore mock state between tests to reduce test coupling/leaks.
        clearMocks: true,
        restoreMocks: true,

        // Don't attempt to transform or load CSS during tests (faster + fewer errors)
        css: false,

        // Astro render tests run in `pnpm test:astro` using `vitest.astro.config.ts` (different
        // environment and transforms), so we exclude them from the jsdom suite.
        exclude: [
            "node_modules/**",
            "dist/**",
            ".astro/**",
            ".vercel/**",
            ".netlify/**",
            "src/**/*.render.test.ts",
        ],
    },
});
