/**
 * @file Contract tests for the presentation metadata bridge consumed by `NotesLayout`.
 *
 * These tests exercise the real bridge composition and generated metadata as an integration sentinel. Lower-level 
 * rules, such as route normalization, DTO projection, and repository parsing, remain covered by `content-core` and
 * infrastructure suites.
 *
 * The suite intentionally focuses on the public presentation contract:
 *
 * - known lesson routes resolve to serializable metadata;
 * - equivalent route inputs resolve to the same canonical DTO;
 * - presentation metadata does not leak source-only fields;
 * - unsupported routes resolve to the missing-result branch.
 */

import type { LessonMetadataAuthorDto, LessonMetadataChangeDto } from "@ravenhill/content-core";
import { describe, expect, suite, test } from "vitest";
import { resolveLessonMetadata } from "../lesson-metadata-bridge";

type LessonMetadataResult = Awaited<ReturnType<typeof resolveLessonMetadata>>;

/**
 * Stable fixture route used as an integration sentinel.
 *
 * The route should point to a real generated lesson with authors and change metadata so the bridge contract can be 
 * verified without mocking the composition root.
 */
const knownLessonPath = "/notes/scripting/support-scripts/";

/**
 * Presentation-safe metadata fields exposed by the bridge.
 *
 * `lastModified` is intentionally allowed but not required because some lessons may not have enough source information 
 * to derive it.
 */
const allowedMetadataKeys = ["authors", "changes", "lastModified"].toSorted();
const requiredMetadataKeys = ["authors", "changes"];

/**
 * Presentation-safe change fields exposed by each metadata change entry.
 */
const allowedChangeKeys = ["author", "date", "hash", "subject"].toSorted();

/**
 * Assert that a bridge result contains metadata and return the narrowed DTO.
 *
 * This keeps failures focused on the discriminated-union contract before tests assert individual metadata fields.
 */
function expectFoundMetadata(result: LessonMetadataResult): Readonly<{
    authors: readonly LessonMetadataAuthorDto[];
    lastModified?: string;
    changes: readonly LessonMetadataChangeDto[];
}> {
    expect(result.kind).toBe("found");

    if (result.kind !== "found") {
        throw new Error(`Expected metadata result to be found, got ${result.kind}`);
    }

    return result.metadata;
}

/**
 * Assert that an object exposes no keys outside the expected DTO boundary.
 */
function expectOnlyAllowedKeys(
    value: Record<string, unknown>,
    allowedKeys: readonly string[],
): void {
    for (const key of Object.keys(value)) {
        expect(allowedKeys).toContain(key);
    }
}

suite("given the lesson metadata bridge", () => {
    describe("when resolving a known lesson route", () => {
        test("then it exposes JSON-serializable metadata", async () => {
            const metadata = expectFoundMetadata(
                await resolveLessonMetadata(knownLessonPath),
            );

            expect(metadata.authors).toBeInstanceOf(Array);
            expect(metadata.changes).toBeInstanceOf(Array);
            expect(JSON.parse(JSON.stringify(metadata))).toEqual(metadata);
        });
    });

    describe("when resolving equivalent route variants", () => {
        test.each([
            [knownLessonPath],
            ["/notes/scripting/support-scripts"],
            ["notes/scripting/support-scripts"],
            ["https://dibs.ravenhill.cl/notes/scripting/support-scripts"],
            ["https://dibs.ravenhill.cl/notes/scripting/support-scripts?from=test#metadata"],
        ])("then %s resolves to the canonical DTO", async (route) => {
            const canonical = await resolveLessonMetadata(knownLessonPath);

            await expect(resolveLessonMetadata(route)).resolves.toEqual(canonical);
        });

        test("then full HTTP(S) URLs resolve by pathname regardless of origin", async () => {
            const canonical = await resolveLessonMetadata(knownLessonPath);

            await expect(
                resolveLessonMetadata("https://example.invalid/notes/scripting/support-scripts/"),
            ).resolves.toEqual(canonical);
        });
    });

    describe("when exposing metadata to the presentation layer", () => {
        test("then it exposes only presentation DTO fields", async () => {
            const metadata = expectFoundMetadata(
                await resolveLessonMetadata(knownLessonPath),
            );

            for (const key of requiredMetadataKeys) {
                expect(metadata).toHaveProperty(key);
            }

            expectOnlyAllowedKeys(metadata, allowedMetadataKeys);
            expect(metadata).not.toHaveProperty("sourceFile");

            for (const change of metadata.changes) {
                expectOnlyAllowedKeys(change, allowedChangeKeys);
                expect(change).not.toHaveProperty("sourceFile");
            }
        });
    });

    describe("when resolving unsupported routes", () => {
        test.each([
            ["/notes/unknown/"],
            ["/notes/keeper-of-the-seven-keys/"],
            ["/exports/pdf/notes/scripting/support-scripts/"],
            [""],
            ["/"],
        ])("then %s returns missing", async (route) => {
            await expect(resolveLessonMetadata(route)).resolves.toMatchObject({
                kind: "missing",
            });
        });
    });
});
