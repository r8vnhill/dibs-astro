import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
    findMissingFiles,
    findBlockedFiles,
    checkSvgParity,
} from "../assert-pack-files.mjs";

// Sanderson-themed fixture names only; never the real 1,521-icon production tarball.
const REQUIRED_FILES = [
    "package/README.md",
    "package/package.json",
    "package/dist/index.js",
    "package/dist/index.d.ts",
    "package/dist/index.js.map",
];

const BLOCKED_PATTERNS = [
    /^package\/AGENTS\.md$/u,
    /^package\/src\//u,
    /^package\/scripts\//u,
    /^package\/tsup\.config\.ts$/u,
    /^package\/tsconfig\.json$/u,
];

describe("findMissingFiles", () => {
    test("reports no findings when every required runtime file is present", () => {
        const files = new Set([
            ...REQUIRED_FILES,
            "package/dist/roshar.svg",
            "package/dist/scadrial.svg",
        ]);

        assert.deepEqual(findMissingFiles(files, REQUIRED_FILES), []);
    });

    test("reports each absent required runtime file", () => {
        const files = new Set([
            "package/README.md",
            "package/package.json",
        ]);

        const findings = findMissingFiles(files, REQUIRED_FILES);

        assert.ok(
            findings.some((finding) => finding.includes("package/dist/index.js")),
        );
        assert.ok(
            findings.some((finding) =>
                finding.includes("package/dist/index.d.ts"),
            ),
        );
        assert.ok(
            findings.some((finding) =>
                finding.includes("package/dist/index.js.map"),
            ),
        );
    });
});

describe("findBlockedFiles", () => {
    test("reports no findings when no blocked internals are present", () => {
        const files = new Set([...REQUIRED_FILES, "package/dist/roshar.svg"]);

        assert.deepEqual(findBlockedFiles(files, BLOCKED_PATTERNS), []);
    });

    test("reports AGENTS.md, src/, scripts/, tsup.config.ts, and tsconfig.json when present", () => {
        const files = new Set([
            ...REQUIRED_FILES,
            "package/AGENTS.md",
            "package/src/urithiru.svg",
            "package/scripts/lib/roshar.mjs",
            "package/tsup.config.ts",
            "package/tsconfig.json",
        ]);

        const findings = findBlockedFiles(files, BLOCKED_PATTERNS);

        assert.ok(findings.some((f) => f.includes("package/AGENTS.md")));
        assert.ok(
            findings.some((f) => f.includes("package/src/urithiru.svg")),
        );
        assert.ok(
            findings.some((f) =>
                f.includes("package/scripts/lib/roshar.mjs"),
            ),
        );
        assert.ok(
            findings.some((f) => f.includes("package/tsup.config.ts")),
        );
        assert.ok(
            findings.some((f) => f.includes("package/tsconfig.json")),
        );
    });
});

describe("checkSvgParity", () => {
    test("reports no finding when the SVG counts match", () => {
        const files = new Set([
            "package/dist/roshar.svg",
            "package/dist/scadrial.svg",
        ]);

        assert.deepEqual(checkSvgParity(files, 2), []);
    });

    test("reports a finding when src has SVGs but dist in the tarball has fewer", () => {
        const files = new Set(["package/dist/roshar.svg"]);

        const findings = checkSvgParity(files, 2);

        assert.equal(findings.length, 1);
        assert.match(findings[0], /2/u);
        assert.match(findings[0], /1/u);
    });

    test("does not report a finding when src has zero SVGs", () => {
        const files = new Set([]);

        assert.deepEqual(checkSvgParity(files, 0), []);
    });
});
