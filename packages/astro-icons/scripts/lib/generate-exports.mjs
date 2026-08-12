// Pure text-rendering and sharding logic for generated icon export barrels. No filesystem or
// process dependencies; the generator shell (generate-icons-index.js) owns all I/O and simply
// writes the parts and barrel this module returns.

export const GENERATED_HEADER = [
    "// This file is auto-generated. Do not edit directly.",
    "// Run 'pnpm generate-icons' to regenerate.",
    "",
].join("\n");

/**
 * Renders a single named re-export line for one icon.
 *
 * @param {{ exportName: string, relativePath: string }} icon
 * @returns {string}
 */
export const renderExportLine = ({ exportName, relativePath }) =>
    `export { default as ${exportName} } from "${relativePath}";`;

/**
 * Renders one shard module: the generated header plus one export line per icon.
 *
 * @param {{ exportName: string, relativePath: string }[]} icons
 * @returns {string}
 */
export const renderExportModule = (icons) =>
    `${GENERATED_HEADER}${icons.map(renderExportLine).join("\n")}\n`;

/**
 * Renders a small top-level barrel that re-exports every shard by wildcard.
 *
 * @param {string[]} partSpecifiers - module specifiers, e.g. "./generated/internal/part-001"
 * @returns {string}
 */
export const renderBarrelModule = (partSpecifiers) =>
    `${GENERATED_HEADER}${
        partSpecifiers.map((specifier) => `export * from "${specifier}";`).join("\n")
    }\n`;

/**
 * Splits an array into fixed-size chunks, preserving order.
 *
 * @param {T[]} items
 * @param {number} size
 * @returns {T[][]}
 */
export function chunkItems(items, size) {
    if (!Number.isInteger(size) || size <= 0) {
        throw new RangeError("chunk size must be a positive integer");
    }
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
}

const partFileName = (index) => `part-${String(index + 1).padStart(3, "0")}`;

/**
 * Plans a deterministic, sharded set of generated export modules plus a barrel that re-exports
 * them all. Pure: callers write the returned parts and barrel to disk.
 *
 * @param {{
 *   icons: { file: string, exportName: string }[],
 *   svgRelativePrefix: string,
 *   partDirSpecifier: string,
 *   shardSize: number,
 * }} options
 * @returns {{ parts: { fileName: string, content: string }[], barrel: string }}
 */
export function planExportModules({ icons, svgRelativePrefix, partDirSpecifier, shardSize }) {
    const sorted = [...icons].sort((a, b) => a.file.localeCompare(b.file));
    const shards = chunkItems(sorted, shardSize);

    const parts = shards.map((shard, index) => ({
        fileName: `${partFileName(index)}.ts`,
        content: renderExportModule(
            shard.map(({ file, exportName }) => ({
                exportName,
                relativePath: `${svgRelativePrefix}${file}`,
            })),
        ),
    }));

    const barrel = renderBarrelModule(
        parts.map((part) => `${partDirSpecifier}/${part.fileName.replace(/\.ts$/, "")}`),
    );

    return { parts, barrel };
}
