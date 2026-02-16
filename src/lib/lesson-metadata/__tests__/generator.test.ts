/**
 * @file generator.test.ts
 *
 * Unit and property-based tests for the lesson-metadata generator helpers.
 *
 * These tests focus on three pure(ish) building blocks exported by `{ts} generator.js`:
 *
 * - {@link readGeneratorConfig}: loads and validates the generator configuration.
 * - {@link readAuthorsByPath}: loads the authors mapping keyed by lesson route.
 * - {@link buildOutput}: produces the final JSON payload with deterministic key ordering.
 *
 * ## The suite combines:
 *
 * - **DDT** (data-driven testing) via `{ts} test.each(...)` for known edge cases.
 * - **PBT** (property-based testing) via `{ts} fast-check` for invariants that should hold across
 *   a wide range of automatically generated inputs.
 *
 * ## Why PBT here?
 *
 * - `buildOutput` must be deterministic: order-independent and key-stable.
 * - Mapping invariants (key equals `entry.path`) are easy to express as properties.
 * - PBT catches “weird” cases that hand-picked examples often miss.
 *
 * ## Notes on determinism
 *
 * Some properties deliberately permute insertion order to ensure the output ordering is derived
 * from sorting keys (not from object insertion order).
 *
 * If you want fully reproducible PBT failures in CI, consider passing a fixed seed:
 *
 * ```ts
 * fc.assert(property, { seed: 42, numRuns: 200 });
 * ```
 */
import fc from "fast-check";
import { buildOutput, readAuthorsByPath, readGeneratorConfig } from "../generator.js";

/**
 * Captures warnings emitted by helpers that accept `{ts} warnFn`.
 *
 * This keeps tests small and makes assertions about warning content and count consistent.
 */
const captureWarnings = (): {
    warnings: string[];
    warnFn: (message: string) => void;
    text: () => string;
} => {
    const warnings: string[] = [];
    return {
        warnings,
        warnFn: (message: string) => warnings.push(message),
        text: () => warnings.join("\n"),
    };
};

describe.concurrent("readGeneratorConfig", () => {
    /**
     * The config reader should:
     *
     * - Accept a `{ts} fallbackAuthorName` string.
     * - Trim it.
     * - Return `{ fallbackAuthorName }`.
     */
    test("returns trimmed fallbackAuthorName for valid config", async () => {
        const config = await readGeneratorConfig({
            configPath: "ignored.json",
            loadJson: async () => ({ fallbackAuthorName: "  Proyecto DIBS  " }),
        });

        expect(config).toEqual({ fallbackAuthorName: "Proyecto DIBS" });
    });

    /**
     * Failure mode contract:
     *
     * - Throws a stable “outer” error message describing what failed.
     * - Includes the cause detail (e.g. ENOENT, JSON parse failure, validation failure).
     *
     * This is intentionally tested as two separate expectations:
     *
     * - One for the stable prefix (so message changes remain controlled).
     * - One for the cause text (so callers have actionable diagnostics).
     */
    test.each([
        [async () => {
            throw new Error("ENOENT");
        }, "ENOENT"],
        [async () => {
            throw new SyntaxError("Unexpected token");
        }, "Unexpected token"],
        [async () => ({ fallbackAuthorName: "" }), "fallbackAuthorName is missing or empty"],
        [async () => ({ fallbackAuthorName: " " }), "fallbackAuthorName is missing or empty"],
    ])("fails with stable outer message and includes cause", async (loadJson, causeText) => {
        await expect(
            readGeneratorConfig({ configPath: "ignored.json", loadJson }),
        ).rejects.toThrow(/^Could not load src\/data\/lesson-metadata\.config\.json/);

        await expect(
            readGeneratorConfig({ configPath: "ignored.json", loadJson }),
        ).rejects.toThrow(causeText);
    });
});

describe.concurrent("readAuthorsByPath", () => {
    /**
     * Happy path: an object mapping route → authors is returned unchanged.
     */
    test("returns parsed object when valid", async () => {
        const authors = await readAuthorsByPath({
            authorsPath: "ignored.json",
            loadJson: async () => ({ "/notes/a/": [{ name: "Ada" }] }),
        });

        expect(authors).toEqual({ "/notes/a/": [{ name: "Ada" }] });
    });

    /**
     * Invalid shape: if the JSON root is not an object (e.g. array), the function:
     *
     * - warns (unless quiet),
     * - returns an empty mapping.
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
     * Load failure: if reading/parsing throws, the function:
     *
     * - warns (unless quiet),
     * - returns an empty mapping,
     * - includes the error message as a “Cause:” suffix for debugging.
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
     * Quiet mode: suppresses warnings but still returns the safe fallback mapping.
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
     * Null root: treated as invalid shape and handled like other non-object results.
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
     * - `generatedAt` comes from the injected `{ts} now()` (easy to test).
     * - `totalLessons` equals the number of entries.
     * - `changesLimit` is propagated.
     * - `entries` are key-sorted deterministically (lexicographically).
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
     * Property: The output map keys match each embedded `entry.path`.
     *
     * This prevents subtle mismatches where the map key differs from the entry content.
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
     * Property: Key order is deterministic regardless of insertion order.
     *
     * To avoid depending on `{ts} Math.random()` inside a property, this test uses a generated
     * numeric `seed` array to produce a deterministic permutation.
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
     * Property: `buildOutput` preserves entry object references.
     *
     * This asserts a non-copying implementation: entries in the output should be the same object
     * instances as those in the input mapping.
     *
     * If you later decide to deep-clone entries (for immutability), change this test to assert
     * deep equality instead of reference equality.
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
