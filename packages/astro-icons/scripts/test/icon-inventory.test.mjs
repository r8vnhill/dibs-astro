import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
    buildIconInventory,
    classifyIcon,
    findExportNameCollisions,
    IconInventoryError,
} from "../lib/icon-inventory.mjs";

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

const VALID_FILENAMES = [
    "acorn.svg",
    ...CUSTOM_BASE_NAMES.map((baseName) => `${baseName}.svg`),
    "file-csv.svg",
];

describe("classifyIcon", () => {
    it("classifies an SVG whose base name is in the custom allowlist as custom", () => {
        const customBaseNameSet = new Set(CUSTOM_BASE_NAMES);
        assert.equal(classifyIcon("bash.svg", customBaseNameSet), "custom");
        assert.equal(
            classifyIcon("nushell-logo.svg", customBaseNameSet),
            "custom",
        );
    });

    it("classifies an SVG whose base name is not in the custom allowlist as phosphor", () => {
        const customBaseNameSet = new Set(CUSTOM_BASE_NAMES);
        assert.equal(
            classifyIcon("file-csv.svg", customBaseNameSet),
            "phosphor",
        );
    });
});

describe("buildIconInventory", () => {
    it("classifies bash.svg and nushell-logo.svg as custom, and file-csv.svg as phosphor", () => {
        const { icons } = buildIconInventory(
            VALID_FILENAMES,
            CUSTOM_BASE_NAMES,
        );

        const groupOf = (file) =>
            icons.find((icon) => icon.file === file).group;
        assert.equal(groupOf("bash.svg"), "custom");
        assert.equal(groupOf("nushell-logo.svg"), "custom");
        assert.equal(groupOf("file-csv.svg"), "phosphor");
    });

    it("orders entries lexically by filename given filenames in arbitrary input order", () => {
        const shuffled = [...VALID_FILENAMES].reverse();
        const { icons } = buildIconInventory(shuffled, CUSTOM_BASE_NAMES);

        const files = icons.map((icon) => icon.file);
        assert.deepEqual(files, [...files].sort());
    });

    it("fails with a missing-custom-icon diagnostic when an allowlisted base name has no SVG", () => {
        const incomplete = VALID_FILENAMES.filter(
            (file) => file !== "bash.svg" && file !== "xml.svg",
        );

        assert.throws(
            () => buildIconInventory(incomplete, CUSTOM_BASE_NAMES),
            (error) => {
                assert.ok(error instanceof IconInventoryError);
                assert.equal(error.code, "MISSING_CUSTOM_ICON");
                assert.deepEqual(error.details.missing, [
                    "bash.svg",
                    "xml.svg",
                ]);
                return true;
            },
        );
    });

    it("fails and reports the export name and both filenames when two distinct filenames collide", () => {
        const colliding = [...VALID_FILENAMES, "file_csv.svg"];

        assert.throws(
            () => buildIconInventory(colliding, CUSTOM_BASE_NAMES),
            (error) => {
                assert.ok(error instanceof IconInventoryError);
                assert.equal(error.code, "EXPORT_NAME_COLLISION");
                assert.deepEqual(error.details.collisions, [
                    {
                        exportName: "FileCsv",
                        files: ["file-csv.svg", "file_csv.svg"],
                    },
                ]);
                return true;
            },
        );
    });

    it("derives counts where custom plus phosphor equals total, total equals entry count, and export names are unique", () => {
        const { icons, counts } = buildIconInventory(
            VALID_FILENAMES,
            CUSTOM_BASE_NAMES,
        );

        assert.equal(counts.custom + counts.phosphor, counts.total);
        assert.equal(counts.total, icons.length);

        const exportNames = icons.map((icon) => icon.exportName);
        assert.equal(new Set(exportNames).size, exportNames.length);
    });
});

describe("findExportNameCollisions", () => {
    it("returns no collisions for unique export names", () => {
        const icons = [
            { file: "acorn.svg", exportName: "Acorn" },
            { file: "bash.svg", exportName: "Bash" },
        ];
        assert.deepEqual(findExportNameCollisions(icons), []);
    });

    it("groups distinct filenames sharing the same export name", () => {
        const icons = [
            { file: "file-csv.svg", exportName: "FileCsv" },
            { file: "file_csv.svg", exportName: "FileCsv" },
        ];
        assert.deepEqual(findExportNameCollisions(icons), [
            { exportName: "FileCsv", files: ["file-csv.svg", "file_csv.svg"] },
        ]);
    });
});
