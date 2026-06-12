import { defineConfig } from "tsup";

/**
 * Build configuration for the public `site-core` package artifact.
 *
 * The package is distributed as a single ESM-only entry point generated from `src/index.ts`. Keep this configuration
 * intentionally small: package-contract behavior should be controlled by the package metadata and validated through
 * consumer-facing smoke tests, not by hidden build-time conventions.
 *
 * ## Important package-contract expectations:
 *
 * - Consumers import the package through the public root entry point.
 * - Type declarations are generated for TypeScript consumers.
 * - The emitted JavaScript remains readable and debuggable.
 * - The build does not assume Node.js, browser, DOM, filesystem, or process APIs.
 * - The package does not publish a CommonJS artifact unless real consumers need it.
 *
 * Changing `format`, `target`, `platform`, `dts`, or `outDir` is a distribution contract change and should be
 * accompanied by package smoke-test updates.
 */
export default defineConfig({
    /**
     * The only public source entry point.
     *
     * Additional public entry points should be added deliberately and mirrored in the package `exports` map so
     * accidental internal imports do not become part of the supported API.
     */
    entry: ["src/index.ts"],

    /**
     * Emit ESM only.
     *
     * Do not add CommonJS output unless there is a confirmed consumer need. Dual ESM/CJS packages increase the
     * validation matrix and require separate smoke coverage for both `import` and `require`.
     */
    format: ["esm"],

    /**
     * Generate `.d.ts` files for TypeScript consumers.
     *
     * Declaration output is part of the package contract and should be validated from a consumer fixture rather than
     * only from source-level type checks.
     */
    dts: true,

    /**
     * Remove stale artifacts before each build.
     *
     * This prevents removed modules or outdated declaration files from remaining in `dist` and being accidentally
     * published.
     */
    clean: true,

    /**
     * Keep the package as a single output graph.
     *
     * Splitting is unnecessary for a single public library entry point and would make the published artifact shape
     * more complex without a clear benefit.
     */
    splitting: false,

    /**
     * Emit source maps to make downstream debugging easier.
     *
     * Source maps are especially useful when package consumers report issues from bundled or transpiled code.
     */
    sourcemap: true,

    /**
     * Keep emitted code unminified.
     *
     * Library packages should prioritize debuggability and predictable output. Application bundlers can minify the
     * final application bundle if needed.
     */
    minify: false,

    /**
     * Target modern JavaScript runtimes while avoiding unnecessarily old output.
     *
     * If this target changes, verify that supported consumers still run the emitted package and that generated
     * declarations remain compatible.
     */
    target: "es2022",

    /**
     * Avoid Node-specific or browser-specific build assumptions.
     *
     * `site-core` is intended to remain host-agnostic. If a future change needs Node.js, browser, DOM, filesystem, or
     * process APIs, that should be treated as an explicit design decision and covered by tests.
     */
    platform: "neutral",

    /**
     * Emit the complete distributable package artifact into `dist`.
     *
     * Keep this path aligned with `package.json` fields such as `exports`, `types`, `main`, and `files`.
     */
    outDir: "dist",
});
