/// <reference types="vitest/config" />

import { getViteConfig } from "astro/config";

/**
 * Vitest configuration used by the project.
 *
 * ## Notes:
 *
 * - We run tests in a jsdom environment because the site renders React components and many tests
 *   interact with DOM APIs (Testing Library + jsdom).
 * - `setupFiles` points to a small bootstrap that installs matchers (jest-dom) and any global test
 *   setup required by the suite.
 * - `globals: true` enables the familiar global test APIs (describe/it/expect) without importing
 *   them in every file. We still import them in some tests for explicitness, but enabling globals
 *   keeps third-party tests simpler.
 * - `css: false` disables CSS processing/transforming within Vitest. The project styles are built
 *   by the real toolchain (Tailwind + Astro) and don't need to be processed during unit tests;
 *   disabling CSS speeds up test runs and avoids unrelated transform errors in jsdom.
 */
export default getViteConfig({
    test: {
        // Run only project test files under src
        include: ["src/**/__tests__/*.{test,spec}.{ts,tsx}"],

        // Use jsdom so DOM APIs (document/window) are available for React testing
        environment: "jsdom",

        // Run this file before the test suite to install helpers (e.g. jest-dom). Path is relative
        // to project root
        setupFiles: ["./src/test/setup.ts"],

        // Allow `describe`/`it`/`expect` as globals (optional --- we still import them in tests
        // where we want explicitness)
        globals: true,

        // Don't attempt to transform or load CSS during tests (faster + fewer errors)
        css: false,

        // Astro component render tests run with `vitest.astro.config.ts` in a separate suite.
        exclude: [
            "node_modules/**",
            "src/**/*.render.test.ts",
        ],
    },
});
