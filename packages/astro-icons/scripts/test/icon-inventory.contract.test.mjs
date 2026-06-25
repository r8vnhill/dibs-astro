import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    scanSvgDirectory,
    serializeInventory,
    DEFAULT_SOURCE_DIR,
    DEFAULT_ARTIFACT_PATH,
} from "../audit-icons.mjs";
import { buildIconInventory } from "../lib/icon-inventory.mjs";

// Mirrors the production allowlist established in Phase 0's baseline.
const CUSTOM_BASE_NAMES = [
    "bash",
    "csv",
    "json",
    "kotlin",
    "nushell-logo",
    "powershell",
    "python",
    "scala",
    "xml",
];

describe("the real packages/astro-icons/src corpus", () => {
    it("contains 1521 icons, 1512 phosphor, 9 custom, with an exact sorted allowlist", async () => {
        const filenames = await scanSvgDirectory(DEFAULT_SOURCE_DIR);
        const { counts } = buildIconInventory(filenames, CUSTOM_BASE_NAMES);

        assert.deepEqual(counts, { total: 1521, phosphor: 1512, custom: 9 });
        assert.deepEqual(
            [...CUSTOM_BASE_NAMES].sort(),
            [...CUSTOM_BASE_NAMES].sort((a, b) => a.localeCompare(b)),
        );
    });

    it("keeps file-csv.svg classified as phosphor with export name FileCsv", async () => {
        const filenames = await scanSvgDirectory(DEFAULT_SOURCE_DIR);
        const { icons } = buildIconInventory(filenames, CUSTOM_BASE_NAMES);

        const fileCsv = icons.find((icon) => icon.file === "file-csv.svg");
        assert.deepEqual(fileCsv, {
            file: "file-csv.svg",
            exportName: "FileCsv",
            group: "phosphor",
        });
    });

    it("exposes Bash, Python, NushellLogo, and FileCsv as present exports", async () => {
        const filenames = await scanSvgDirectory(DEFAULT_SOURCE_DIR);
        const { icons } = buildIconInventory(filenames, CUSTOM_BASE_NAMES);
        const exportNames = new Set(icons.map((icon) => icon.exportName));

        assert.ok(exportNames.has("Bash"));
        assert.ok(exportNames.has("Python"));
        assert.ok(exportNames.has("NushellLogo"));
        assert.ok(exportNames.has("FileCsv"));
    });

    it("matches the committed migration/icon-inventory.json byte-for-byte", async () => {
        const filenames = await scanSvgDirectory(DEFAULT_SOURCE_DIR);
        const serialized = serializeInventory(filenames, CUSTOM_BASE_NAMES);
        const committed = await readFile(DEFAULT_ARTIFACT_PATH, "utf8");

        assert.equal(committed, serialized);
    });
});
