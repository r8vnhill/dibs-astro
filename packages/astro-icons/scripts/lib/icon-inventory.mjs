// Pure inventory model: builds and validates the icon inventory from an in-memory list of SVG
// filenames. No filesystem, process, or CLI dependencies.

import { toPascalCase } from "./icon-name.mjs";

export class IconInventoryError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = "IconInventoryError";
        this.code = code;
        this.details = details;
    }
}

/**
 * Classifies a single SVG filename as "custom" or "phosphor".
 *
 * @param {string} filename
 * @param {Set<string>} customBaseNameSet - base names (without extension) in the allowlist
 * @returns {"custom" | "phosphor"}
 */
export function classifyIcon(filename, customBaseNameSet) {
    const baseName = filename.replace(/\.svg$/, "");
    return customBaseNameSet.has(baseName) ? "custom" : "phosphor";
}

/**
 * Throws a MISSING_CUSTOM_ICON error listing every allowlisted base name with no corresponding
 * file, sorted deterministically.
 *
 * @param {Iterable<string>} filenames
 * @param {Iterable<string>} customBaseNames
 */
export function assertCustomIconsPresent(filenames, customBaseNames) {
    const fileSet = new Set(filenames);
    const missing = [...new Set(customBaseNames)]
        .map((baseName) => `${baseName}.svg`)
        .filter((file) => !fileSet.has(file))
        .sort();

    if (missing.length > 0) {
        throw new IconInventoryError(
            "MISSING_CUSTOM_ICON",
            `Missing custom icon file(s): ${missing.join(", ")}`,
            { missing },
        );
    }
}

/**
 * Finds groups of distinct filenames that produce the same PascalCase export name.
 *
 * @param {{ file: string, exportName: string }[]} icons
 * @returns {{ exportName: string, files: string[] }[]}
 */
export function findExportNameCollisions(icons) {
    const filesByExportName = new Map();

    for (const { file, exportName } of icons) {
        const files = filesByExportName.get(exportName) ?? [];
        files.push(file);
        filesByExportName.set(exportName, files);
    }

    return [...filesByExportName.entries()]
        .filter(([, files]) => files.length > 1)
        .map(([exportName, files]) => ({
            exportName,
            files: [...files].sort(),
        }));
}

function deriveCounts(icons) {
    const total = icons.length;
    const custom = icons.filter((icon) => icon.group === "custom").length;
    const phosphor = total - custom;

    if (custom + phosphor !== total || total !== icons.length) {
        throw new IconInventoryError(
            "INVALID_INVENTORY_COUNTS",
            "Derived custom and phosphor counts do not sum to the total entry count.",
        );
    }

    return { total, phosphor, custom };
}

/**
 * Builds the complete, validated icon inventory from an in-memory list of SVG filenames.
 *
 * @param {Iterable<string>} filenames
 * @param {Iterable<string>} customBaseNames - allowlisted base names (without extension)
 * @returns {{
 *   icons: { file: string, exportName: string, group: "custom" | "phosphor" }[],
 *   counts: { total: number, phosphor: number, custom: number },
 * }}
 */
export function buildIconInventory(filenames, customBaseNames) {
    const customBaseNameSet = new Set(customBaseNames);

    assertCustomIconsPresent(filenames, customBaseNameSet);

    const icons = [...filenames].sort().map((file) => ({
        file,
        exportName: toPascalCase(file),
        group: classifyIcon(file, customBaseNameSet),
    }));

    const collisions = findExportNameCollisions(icons);
    if (collisions.length > 0) {
        throw new IconInventoryError(
            "EXPORT_NAME_COLLISION",
            `Export name collision(s) detected: ${collisions
                .map(
                    ({ exportName, files }) =>
                        `${exportName} (${files.join(", ")})`,
                )
                .join("; ")}`,
            { collisions },
        );
    }

    return { icons, counts: deriveCounts(icons) };
}
