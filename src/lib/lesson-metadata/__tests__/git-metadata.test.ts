/**
 * @file git-metadata.test.ts
 *
 * Property-based and example-based tests for the `git-metadata` module.
 *
 * These tests validate three core behaviors:
 *
 * 1. **Path -> Route derivation**: Astro source file paths under `src/pages` are converted into
 *    canonical lesson routes (leading `/`, trailing `/`, and `index` collapsing).
 * 2. **Git log parsing**: `git log` output exported with a delimiter-based format is parsed into
 *    stable change records, with strict ISO short dates (`YYYY-MM-DD`).
 * 3. **Metadata assembly**: Given a source file, changes, and author mappings, the module builds a
 *    lesson metadata entry including `lastModified` derived from the newest date.
 *
 * ## Tooling
 *
 * - Test runner: Vitest/Jest-compatible APIs (`describe`, `test`, `expect`).
 * - Property-based testing: `{ts} fast-check` (`fc.assert`, `fc.property`).
 *
 * ## Why property-based tests here?
 *
 * Several functions are **pure** and **string-heavy**, which makes them perfect for PBT:
 *
 * - `sourceFileToLessonPath` must enforce *route invariants* regardless of path shape.
 * - `parseGitLogLine` must preserve subjects (including delimiters) while enforcing a strict
 *   contract for required fields.
 *
 * PBT complements table-driven tests by exploring many combinations automatically and shrinking
 * failures to minimal counterexamples.
 *
 * ## Notes on generators
 *
 * - Route segments are restricted to `[a-z0-9-]` to avoid accidental invalid routes and keep the
 *   property focused on **normalization** instead of **validation**.
 * - Subject generation excludes `\n` and `\r` because the line parser operates on a single line and
 *   newline characters would violate the input contract.
 */
import fc from "fast-check";
import {
    buildLessonMetadataEntry,
    parseGitLogLine,
    parseGitLogOutput,
    resolveAuthors,
    sourceFileToLessonPath,
    toIsoShortDate,
} from "../git-metadata.js";

/**
 * Shared test constants.
 *
 * Using explicit constants keeps the suite:
 *
 * - Easy to refactor (one update instead of many).
 * - Consistent across tests.
 * - Clear about what is “configuration” versus “test data”.
 */
const PAGES_ROOT = "src/pages";
const FALLBACK_AUTHOR = "Proyecto DIBS";
const SAMPLE_SOURCE = "src/pages/notes/software-libraries/scripting/first-script/index.astro";
const SAMPLE_ROUTE = "/notes/software-libraries/scripting/first-script/";

describe.concurrent("sourceFileToLessonPath", () => {
    /**
     * Example-based tests cover known mappings and edge cases:
     *
     * - `index.astro` collapses to its directory route.
     * - `.astro` files become routes with trailing slashes.
     * - Windows-style paths are supported.
     * - Redundant slashes are collapsed.
     */
    test.each([
        ["src/pages/index.astro", "/"],
        ["src/pages/foo/index.astro", "/foo/"],
        ["src/pages/foo.astro", "/foo/"],
        ["src/pages/foo/bar.astro", "/foo/bar/"],
        ["src/pages//foo//index.astro", "/foo/"],
        [
            "src\\pages\\notes\\software-libraries\\scripting\\first-script\\index.astro",
            SAMPLE_ROUTE,
        ],
    ])("maps %s to %s", (input, expected) => {
        expect(sourceFileToLessonPath(input)).toBe(expected);
    });

    /**
     * Invalid inputs return `undefined` instead of throwing:
     *
     * - Non-Astro extensions.
     * - “Almost pages root” paths (e.g. `src/pagesbar/...`).
     * - Paths outside the pages root.
     * - Degenerate `.astro` filename.
     */
    test.each([
        "src/pages/foo.txt",
        "src/pagesbar/foo.astro",
        "other/path/file.astro",
        "src/pages/.astro",
    ])("returns undefined for invalid source paths: %s", (input) => {
        expect(sourceFileToLessonPath(input)).toBeUndefined();
    });

    /**
     * Property: Derived lesson routes are canonical.
     *
     * For any generated Astro source under `src/pages`, the resolved route:
     *
     * - exists (`defined`)
     * - starts with `/`
     * - ends with `/`
     * - contains no duplicate slashes (`//`)
     * - never ends in `/index/` (index routes are collapsed)
     */
    test("property: generated lesson routes are normalized and index-free", () => {
        const segmentArb = fc.stringMatching(/^[a-z0-9-]{1,12}$/);
        const segmentsArb = fc.array(segmentArb, { minLength: 1, maxLength: 5 });

        fc.assert(
            fc.property(segmentsArb, fc.boolean(), (segments, useIndexRoute) => {
                const routeTail = useIndexRoute
                    ? `${segments.join("/")}/index.astro`
                    : `${segments.join("/")}.astro`;

                const source = `src/pages/${routeTail}`;
                const resolved = sourceFileToLessonPath(source);

                expect(resolved).toBeDefined();
                expect(resolved?.startsWith("/")).toBe(true);
                expect(resolved?.endsWith("/")).toBe(true);
                expect(resolved?.includes("//")).toBe(false);
                expect(resolved?.endsWith("/index/")).toBe(false);
            }),
        );
    });
});

describe.concurrent("parseGitLogOutput", () => {
    /**
     * Contract: This parser is designed for `git log --date=short` (ISO short dates).
     *
     * Example format (pipe-delimited):
     *
     * - `%H|%ad|%an|%s`
     */
    test("parses lines exported with --date=short", () => {
        const parsed = parseGitLogOutput(
            [
                "abc123|2026-02-11|r8vnhill|feat: update lesson",
                "def456|2025-10-24|r8vnhill|fix: typo",
            ].join("\n"),
        );

        expect(parsed).toEqual([
            {
                hash: "abc123",
                date: "2026-02-11",
                author: "r8vnhill",
                subject: "feat: update lesson",
            },
            {
                hash: "def456",
                date: "2025-10-24",
                author: "r8vnhill",
                subject: "fix: typo",
            },
        ]);
    });

    /**
     * The subject is allowed to contain the delimiter. The parser reconstructs it by joining the
     * remainder of split parts back together.
     */
    test("preserves subjects containing delimiter characters", () => {
        const parsed = parseGitLogOutput("abc123|2026-02-11|r8vnhill|feat: foo | bar | baz");
        expect(parsed[0]?.subject).toBe("feat: foo | bar | baz");
    });

    /**
     * Invalid dates are rejected to avoid locale- or runtime-dependent parsing. This keeps metadata
     * stable across platforms and CI environments.
     */
    test("drops lines with invalid dates", () => {
        const parsed = parseGitLogOutput("abc123|02/11/2026|r8vnhill|feat: update lesson");
        expect(parsed).toEqual([]);
    });

    /**
     * Empty lines are ignored to tolerate trailing newlines or accidental spacing.
     */
    test("ignores empty lines between valid entries", () => {
        const parsed = parseGitLogOutput(
            "abc123|2026-02-11|r8vnhill|feat: one\n\n\ndef456|2026-02-10|r8vnhill|feat: two",
        );
        expect(parsed).toHaveLength(2);
    });

    /**
     * Windows environments may produce CRLF-separated output. The parser should handle both `\n` and
     * `\r\n`.
     */
    test("parses CRLF-separated output", () => {
        const parsed = parseGitLogOutput(
            "abc123|2026-02-11|r8vnhill|feat: one\r\ndef456|2026-02-10|r8vnhill|feat: two",
        );
        expect(parsed).toHaveLength(2);
    });
});

describe.concurrent("parseGitLogLine", () => {
    /**
     * Example-based coverage for:
     *
     * - Empty/whitespace lines.
     * - Missing required fields.
     * - Invalid dates.
     * - Alternative delimiters (including NUL).
     * - Subjects containing the delimiter.
     *
     * Note: The NUL delimiter example uses `\u0000` (`\x00`) as the split token.
     */
    test.each([
        ["", "|", undefined],
        ["   ", "|", undefined],
        ["abc123|2026-02-11||feat: missing author", "|", undefined],
        ["abc123|02/11/2026|r8vnhill|feat: invalid date", "|", undefined],
        [
            "abc123\x002026-02-11\x00r8vnhill\x00feat: nul delimiter",
            "\u0000",
            {
                hash: "abc123",
                date: "2026-02-11",
                author: "r8vnhill",
                subject: "feat: nul delimiter",
            },
        ],
        [
            "abc123|2026-02-11|r8vnhill|feat: foo | bar",
            "|",
            {
                hash: "abc123",
                date: "2026-02-11",
                author: "r8vnhill",
                subject: "feat: foo | bar",
            },
        ],
    ])("parses line case %#", (line, delimiter, expected) => {
        expect(parseGitLogLine(line, delimiter)).toEqual(expected);
    });

    /**
     * Property: Subject content is preserved, modulo trimming.
     *
     * The parser trims the full line and then reconstructs the subject; therefore the expected
     * contract is `subject.trim()`.
     *
     * We exclude newlines from the generator because `parseGitLogLine` operates on a *single line*
     * and does not attempt to handle multi-line subjects.
     */
    test("property: preserves subject content (trimmed contract)", () => {
        const safeSubject = fc.string().filter(
            (value) => !value.includes("\n") && !value.includes("\r"),
        );

        fc.assert(
            fc.property(safeSubject, (subject) => {
                const line = `abc123|2026-02-11|r8vnhill|${subject}`;
                const parsed = parseGitLogLine(line);
                expect(parsed?.subject).toBe(subject.trim());
            }),
        );
    });
});

describe.concurrent("toIsoShortDate", () => {
    /**
     * ISO short dates (`YYYY-MM-DD`) are accepted and normalized by trimming whitespace.
     */
    test.each([
        ["2026-02-16", "2026-02-16"],
        [" 2026-02-16 ", "2026-02-16"],
        ["2026-02-16\n", "2026-02-16"],
    ])("keeps valid ISO short date %s", (input, expected) => {
        expect(toIsoShortDate(input)).toBe(expected);
    });

    /**
     * Non-ISO formats are rejected.
     *
     * Note: `YYYY-MM-DDTHH:mm:ssZ` is intentionally not accepted; upstream code should ensure
     * `--date=short` or pre-normalize to `YYYY-MM-DD`.
     */
    test.each(["16-02-2026", "02/16/2026", "2026-2-16", "invalid", "2026-02-16T00:00:00Z"])(
        "returns undefined for non ISO format: %s",
        (input) => {
            expect(toIsoShortDate(input)).toBeUndefined();
        },
    );
});

describe.concurrent("resolveAuthors", () => {
    /**
     * If no explicit authors exist for a path, the configured fallback is used.
     */
    test("uses configured fallback author when provided", () => {
        expect(resolveAuthors("/notes/example/", {}, FALLBACK_AUTHOR)).toEqual([
            { name: FALLBACK_AUTHOR },
        ]);
    });

    /**
     * If neither explicit authors nor a fallback is provided, the author list is empty. This keeps
     * the output schema stable while making the missing configuration explicit.
     */
    test("returns empty list when no author and no fallback is provided", () => {
        expect(resolveAuthors("/notes/example/", {})).toEqual([]);
    });
});

describe.concurrent("buildLessonMetadataEntry", () => {
    /**
     * Metadata entries:
     *
     * - derive `path` from the Astro file’s route
     * - store a normalized `sourceFile` path
     * - resolve authors (with optional fallback)
     * - compute `lastModified` from the newest ISO date across `changes`
     */
    test("builds entry with lastModified from newest git event", () => {
        const changes = parseGitLogOutput("abc123|2026-02-11|r8vnhill|feat: update lesson");
        const entry = buildLessonMetadataEntry(
            SAMPLE_SOURCE,
            changes,
            {},
            PAGES_ROOT,
            FALLBACK_AUTHOR,
        );

        expect(entry).toMatchObject({
            path: SAMPLE_ROUTE,
            sourceFile: SAMPLE_SOURCE,
            authors: [{ name: FALLBACK_AUTHOR }],
            lastModified: "2026-02-11",
        });
        expect(entry?.changes).toHaveLength(1);
    });

    /**
     * If a fallback author is configured, entries include it when `authorsByPath` has no explicit
     * authors for the route.
     */
    test("uses configured fallback author in metadata entry", () => {
        const entry = buildLessonMetadataEntry(SAMPLE_SOURCE, [], {}, PAGES_ROOT, FALLBACK_AUTHOR);
        expect(entry?.authors).toEqual([{ name: FALLBACK_AUTHOR }]);
    });

    /**
     * If the fallback author is omitted, entries keep an empty authors list.
     */
    test("returns empty authors when fallback is omitted", () => {
        const entry = buildLessonMetadataEntry(SAMPLE_SOURCE, [], {}, PAGES_ROOT);
        expect(entry?.authors).toEqual([]);
    });

    /**
     * `lastModified` is the newest ISO date across all changes, regardless of input order.
     */
    test.each([
        [
            [
                { hash: "old1", date: "2025-01-01", author: "a", subject: "old" },
                { hash: "new1", date: "2026-01-01", author: "b", subject: "new" },
            ],
            "2026-01-01",
        ],
        [
            [
                { hash: "a", date: "2026-01-01", author: "x", subject: "one" },
                { hash: "b", date: "2026-01-01", author: "y", subject: "two" },
            ],
            "2026-01-01",
        ],
        [[], undefined],
    ])("derives lastModified correctly for change set %#", (changes, expected) => {
        const entry = buildLessonMetadataEntry(
            SAMPLE_SOURCE,
            changes,
            {},
            PAGES_ROOT,
            FALLBACK_AUTHOR,
        );
        expect(entry?.lastModified).toBe(expected);
    });

    /**
     * Non-lesson files (not under `src/pages` or not `.astro`) do not produce entries.
     */
    test.each(["README.md", "src/content/notes.md", "src/pages/notes/topic.md"])(
        "returns undefined for non-lesson source files: %s",
        (sourceFile) => {
            const entry = buildLessonMetadataEntry(sourceFile, [], {}, PAGES_ROOT, FALLBACK_AUTHOR);
            expect(entry).toBeUndefined();
        },
    );
});
