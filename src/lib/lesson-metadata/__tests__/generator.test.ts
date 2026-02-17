/**
 * @file generator.test.ts
 *
 * Unit and property-based tests for the lesson-metadata generator helpers.
 *
 * This suite validates the behavior of the core building blocks exported by `generator.js`:
 *
 * - {@link readGeneratorConfig}
 * - {@link readAuthorsByPath}
 * - {@link buildOutput}
 * - {@link getChanges}
 *
 * These helpers are intentionally written in a functional style (dependency injection for I/O and
 * time), which makes them straightforward to test in isolation without touching the real
 * filesystem or Git.
 *
 * ## Testing Strategy
 *
 * The suite combines:
 *
 * - **Unit tests** for well-defined success and failure scenarios.
 * - **DDT (Data-Driven Testing)** using `{ts} test.each(...)` for structured edge cases and
 *   failure-mode matrices.
 * - **PBT (Property-Based Testing)** using `fast-check` to assert invariants over a large input
 *   space.
 *
 * ## Why Property-Based Testing here?
 *
 * `buildOutput` must satisfy structural invariants that are easier to express as properties than
 * as example-based tests:
 *
 * - Deterministic key ordering (independent of insertion order).
 * - Output keys must match each embedded `entry.path`.
 * - Entries should not be accidentally cloned or mutated.
 *
 * PBT is especially valuable for catching:
 *
 * - Subtle ordering regressions.
 * - Edge cases involving empty arrays or odd strings.
 * - Invariants violated by refactors.
 *
 * ## Determinism and CI
 *
 * For fully reproducible CI failures, you can fix the seed:
 *
 * ```ts
 * fc.assert(property, { seed: 42, numRuns: 200 });
 * ```
 *
 * This suite currently relies on fast-check defaults but is structured to support seeded execution
 * easily.
 */

import fc from "fast-check";
import {
    buildOutput,
    getChanges,
    readAuthorsByPath,
    readGeneratorConfig,
} from "../generator.js";

/**
 * Captures warnings emitted by helpers that accept `{ts} warnFn`.
 *
 * ## Many helpers are designed to:
 *
 * - Fail gracefully,
 * - Return safe fallbacks,
 * - Emit warnings instead of throwing.
 *
 * ## This utility keeps tests clean and allows:
 *
 * - Assertions on warning count,
 * - Assertions on warning message content,
 * - Quiet-mode verification.
 *
 * @returns Object containing:
 *   - `warnings`: collected messages,
 *   - `warnFn`: function to inject into helpers,
 *   - `text()`: convenience concatenation.
 */
function captureWarnings(): {
    warnings: string[];
    warnFn: (message: string) => void;
    text: () => string;
} {
    const warnings: string[] = [];

    return {
        warnings,
        warnFn: (message: string) => warnings.push(message),
        text: () => warnings.join("\n"),
    };
}

describe.concurrent("readGeneratorConfig", () => {
    /**
     * Happy-path contract:
     *
     * - Accepts a `{ts} fallbackAuthorName`.
     * - Trims surrounding whitespace.
     * - Returns a normalized config object.
     *
     * Dependency injection (`loadJson`) avoids real filesystem access.
     */
    test("returns trimmed fallbackAuthorName for valid config", async () => {
        const config = await readGeneratorConfig({
            configPath: "ignored.json",
            loadJson: async () => ({ fallbackAuthorName: "  Proyecto DIBS  " }),
        });

        expect(config).toEqual({ fallbackAuthorName: "Proyecto DIBS" });
    });

    /**
     * Failure-mode contract:
     *
     * - Throws a stable outer message.
     * - Preserves underlying cause information.
     *
     * This ensures callers:
     * - Can pattern-match the outer failure,
     * - Still see actionable diagnostics.
     */
    test.each([
        [
            async () => {
                throw new Error("ENOENT");
            },
            "ENOENT",
        ],
        [
            async () => {
                throw new SyntaxError("Unexpected token");
            },
            "Unexpected token",
        ],
        [
            async () => ({ fallbackAuthorName: "" }),
            "fallbackAuthorName is missing or empty",
        ],
        [
            async () => ({ fallbackAuthorName: " " }),
            "fallbackAuthorName is missing or empty",
        ],
    ])(
        "fails with stable outer message and includes cause",
        async (loadJson, causeText) => {
            await expect(
                readGeneratorConfig({ configPath: "ignored.json", loadJson }),
            ).rejects.toThrow(
                /^Could not load src\/data\/lesson-metadata\.config\.json/,
            );

            await expect(
                readGeneratorConfig({ configPath: "ignored.json", loadJson }),
            ).rejects.toThrow(causeText);
        },
    );
});

describe.concurrent("readAuthorsByPath", () => {
    /**
     * Happy path:
     *
     * - JSON root is an object.
     * - Mapping is returned unchanged.
     */
    test("returns parsed object when valid", async () => {
        const authors = await readAuthorsByPath({
            authorsPath: "ignored.json",
            loadJson: async () => ({ "/notes/a/": [{ name: "Ada" }] }),
        });

        expect(authors).toEqual({ "/notes/a/": [{ name: "Ada" }] });
    });

    /**
     * Invalid root shape:
     *
     * - Non-object roots (e.g. arrays) are treated as invalid.
     * - Returns empty mapping.
     * - Emits warning unless quiet.
     */
    test("returns empty object and warns when parsed value is invalid shape", async () => {
        const cap = captureWarnings();

        const authors = await readAuthorsByPath({
            authorsPath: "ignored.json",
            loadJson: async () => ["not-an-object"],
            warnFn: cap.warnFn,
        });

        expect(authors).toEqual({});
        expect(cap.text()).toContain("is not an object");
    });

    /**
     * Load failure:
     *
     * - JSON read/parse throws.
     * - Returns empty mapping.
     * - Emits warning with “Cause:” suffix.
     */
    test("returns empty object and warns when JSON load fails", async () => {
        const cap = captureWarnings();

        const authors = await readAuthorsByPath({
            authorsPath: "ignored.json",
            loadJson: async () => {
                throw new SyntaxError("Unexpected token");
            },
            warnFn: cap.warnFn,
        });

        expect(authors).toEqual({});
        expect(cap.text()).toContain("Cause: Unexpected token");
    });

    /**
     * Quiet mode:
     *
     * - Suppresses warnings.
     * - Still returns safe fallback.
     */
    test("quiet mode suppresses warnings", async () => {
        const cap = captureWarnings();

        const authors = await readAuthorsByPath({
            authorsPath: "ignored.json",
            loadJson: async () => {
                throw new Error("ENOENT");
            },
            quiet: true,
            warnFn: cap.warnFn,
        });

        expect(authors).toEqual({});
        expect(cap.warnings).toHaveLength(0);
    });

    /**
     * Null root behaves like other invalid shapes.
     */
    test("returns empty object and warns when parsed value is null", async () => {
        const cap = captureWarnings();

        const authors = await readAuthorsByPath({
            authorsPath: "ignored.json",
            loadJson: async () => null,
            warnFn: cap.warnFn,
        });

        expect(authors).toEqual({});
        expect(cap.text()).toContain("is not an object");
    });
});

describe.concurrent("buildOutput", () => {
    /**
     * Output contract:
     *
     * - `generatedAt` is injected via `{ts} now()`.
     * - `totalLessons` matches entry count.
     * - `changesLimit` is propagated.
     * - Keys are lexicographically sorted.
     */
    test("builds expected structure and counts lessons", () => {
        const output = buildOutput({
            entries: {
                "/b/": { path: "/b/", sourceFile: "src/pages/b.astro", authors: [], changes: [] },
                "/a/": { path: "/a/", sourceFile: "src/pages/a.astro", authors: [], changes: [] },
            },
            changesLimit: 7,
            now: () => "2026-02-16T00:00:00.000Z",
        });

        expect(output).toMatchObject({
            generatedAt: "2026-02-16T00:00:00.000Z",
            totalLessons: 2,
            changesLimit: 7,
        });

        expect(Object.keys(output.entries)).toEqual(["/a/", "/b/"]);
    });

    /**
     * Property:
     *
     * Output keys must equal each embedded `entry.path`.
     */
    test("property: output keys match each entry.path", () => {
        const routeArb = fc
            .array(fc.stringMatching(/^[a-z0-9-]{1,8}$/), { minLength: 1, maxLength: 4 })
            .map((segments) => `/${segments.join("/")}/`);

        const routesArb = fc.uniqueArray(routeArb, { minLength: 1, maxLength: 12 });

        fc.assert(
            fc.property(routesArb, (routes) => {
                const entries = Object.fromEntries(
                    routes.map((route) => [
                        route,
                        {
                            path: route,
                            sourceFile: `src/pages${route}index.astro`,
                            authors: [],
                            changes: [],
                        },
                    ]),
                );

                const output = buildOutput({ entries, now: () => "2026-02-16T00:00:00.000Z" });

                for (const key of Object.keys(output.entries)) {
                    expect(output.entries[key].path).toBe(key);
                }
            }),
        );
    });

    /**
     * Property:
     *
     * Key ordering is deterministic regardless of insertion order.
     */
    test("property: key order is deterministic regardless of insertion order", () => {
        const routeArb = fc
            .array(fc.stringMatching(/^[a-z0-9-]{1,8}$/), { minLength: 1, maxLength: 4 })
            .map((segments) => `/${segments.join("/")}/`);

        const routesArb = fc.uniqueArray(routeArb, { minLength: 1, maxLength: 10 });

        fc.assert(
            fc.property(
                routesArb,
                fc.array(fc.nat(), { minLength: 1, maxLength: 20 }),
                (routes, seed) => {
                    const permuted = [...routes].sort((a, b) => {
                        const ai = seed[routes.indexOf(a) % seed.length] ?? 0;
                        const bi = seed[routes.indexOf(b) % seed.length] ?? 0;
                        return ai - bi;
                    });

                    const entries = Object.fromEntries(
                        permuted.map((route) => [
                            route,
                            {
                                path: route,
                                sourceFile: `src/pages${route}index.astro`,
                                authors: [],
                                changes: [],
                            },
                        ]),
                    );

                    const output = buildOutput({ entries, now: () => "2026-02-16T00:00:00.000Z" });

                    const keys = Object.keys(output.entries);
                    const sorted = [...routes].sort((a, b) => a.localeCompare(b));
                    expect(keys).toEqual(sorted);
                },
            ),
        );
    });

    /**
     * Property:
     *
     * `buildOutput` preserves entry object references.
     *
     * This guards against accidental deep cloning.
     * If immutability is later introduced, update this test accordingly.
     */
    test("property: buildOutput preserves entry object references", () => {
        const routeArb = fc
            .array(fc.stringMatching(/^[a-z0-9-]{1,8}$/), { minLength: 1, maxLength: 4 })
            .map((segments) => `/${segments.join("/")}/`);

        const routesArb = fc.uniqueArray(routeArb, { minLength: 1, maxLength: 8 });

        fc.assert(
            fc.property(routesArb, (routes) => {
                const entries = Object.fromEntries(
                    routes.map((route) => [
                        route,
                        {
                            path: route,
                            sourceFile: `src/pages${route}index.astro`,
                            authors: [],
                            changes: [],
                        },
                    ]),
                );

                const output = buildOutput({ entries, now: () => "2026-02-16T00:00:00.000Z" });

                for (const route of routes) {
                    expect(output.entries[route]).toBe(entries[route]);
                }
            }),
        );
    });
});

describe.concurrent("getChanges", () => {
    /**
     * Git failure contract:
     *
     * - If `git` is unavailable or fails,
     * - The function returns an empty list,
     * - Emits a warning including the underlying cause.
     *
     * This ensures:
     * - CI environments without Git do not break the generator.
     * - Failures are observable but non-fatal.
     */
    test("returns empty list and warns when git is not available", async () => {
        const cap = captureWarnings();

        const changes = await getChanges({
            sourceFile: "src/pages/notes/index.astro",
            cwd: "ignored",
            warnFn: cap.warnFn,
            execFileFn: (async () => {
                throw new Error("spawn git ENOENT");
            }) as any,
        });

        expect(changes).toEqual([]);
        expect(cap.text()).toContain("Could not read git log");
        expect(cap.text()).toContain("spawn git ENOENT");
    });
});
