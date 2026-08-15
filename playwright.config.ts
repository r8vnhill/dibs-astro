import { defineConfig, devices } from "@playwright/test";
import { resolvePlaywrightTarget } from "./tests/e2e/playwright-target";

const target = resolvePlaywrightTarget(process.env.CONTAINER_BASE_URL, Boolean(process.env.CI));

/**
 * General-purpose Playwright UI regression harness, scoped to the lesson TOC's real-browser
 * behavior (`tests/e2e/lesson-toc-*.spec.ts`) rather than a broad E2E buildout — this exists to
 * catch real-browser layout/scrolling defects that pure-function and jsdom-based tests structurally
 * cannot detect (jsdom does not implement CSS layout — see
 * `traceability-log/open/fix_keep_the_lesson_toc_pinned_throughout_long_page_scrolling.md`).
 *
 * The webServer starts Astro's dev server directly rather than via `pnpm dev`, which would re-run
 * the full `predev` generation chain (i18n compile, four package builds, bibliography catalog,
 * lesson metadata) on every invocation — several minutes of cold-start cost this harness doesn't
 * need on every run. Callers (including CI's `test:e2e` job) are responsible for having those
 * generated artifacts in place first, the same way `test:unit`/`test:astro-render` do.
 */
export default defineConfig({
    testDir: "tests/e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? "dot" : "list",

    use: {
        baseURL: target.baseURL,
        trace: "on-first-retry",
    },

    projects: [
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
                // The lesson TOC panel (`.lesson-toc`) only renders at >=1440px
                // (`src/layouts/NotesLayout.astro`); below that it's `display: none`. The default
                // "Desktop Chrome" viewport (1280x720) would make every assertion in these specs
                // vacuously trivial (zero-size rects) instead of exercising real layout. This is the
                // "normal desktop" baseline (tall enough that the TOC list fits without overflowing);
                // specs that specifically need a short/overflowing viewport pin their own via
                // `test.use({ viewport })` rather than relying on this default.
                viewport: { width: 1600, height: 900 },
            },
        },
    ],

    ...(target.webServer ? { webServer: target.webServer } : {}),
});
