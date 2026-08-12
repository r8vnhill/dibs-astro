import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { extractSvgImportFileNames, findUnresolvedSvgImports } from "../lib/artifact-integrity.mjs";

describe("extractSvgImportFileNames", () => {
    test("keeps only .svg specifiers and reduces them to a basename", () => {
        assert.deepEqual(
            extractSvgImportFileNames(["./roshar.svg", "../scadrial.svg", "node:path", "./index.js"]),
            ["roshar.svg", "scadrial.svg"],
        );
    });

    test("ignores non-string entries", () => {
        assert.deepEqual(extractSvgImportFileNames([undefined, null, "./roshar.svg"]), ["roshar.svg"]);
    });
});

describe("Feature: published module asset integrity", () => {
    test("Scenario: every SVG import in dist/index.js exists in the artifact", () => {
        const unresolved = findUnresolvedSvgImports({
            specifiers: ["./roshar.svg", "./scadrial.svg"],
            availableFiles: ["index.js", "index.d.ts", "roshar.svg", "scadrial.svg"],
        });

        assert.deepEqual(unresolved, []);
    });

    test("Scenario: an import references an SVG missing from the artifact", () => {
        const unresolved = findUnresolvedSvgImports({
            specifiers: ["./roshar.svg", "./nalthis.svg"],
            availableFiles: ["index.js", "roshar.svg"],
        });

        assert.deepEqual(unresolved, ["nalthis.svg"]);
    });

    test("deduplicates repeated import specifiers for the same missing file", () => {
        const unresolved = findUnresolvedSvgImports({
            specifiers: ["./nalthis.svg", "./nalthis.svg"],
            availableFiles: [],
        });

        assert.deepEqual(unresolved, ["nalthis.svg"]);
    });
});
