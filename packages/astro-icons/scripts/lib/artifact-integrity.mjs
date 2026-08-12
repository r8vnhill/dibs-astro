// Pure core for the built-artifact API-to-asset integrity check: given the SVG import specifiers
// found in a built module and the files actually present alongside it, finds specifiers that do
// not resolve to a packaged file. No filesystem, process, or parser dependency -- the shell
// (verify-artifact-integrity.mjs) owns es-module-lexer parsing and file listing.

/**
 * Extracts the basename of every `.svg` import specifier.
 *
 * @param {string[]} specifiers - raw import specifiers from a parsed module
 * @returns {string[]}
 */
export function extractSvgImportFileNames(specifiers) {
    return specifiers
        .filter((specifier) => typeof specifier === "string" && specifier.endsWith(".svg"))
        .map((specifier) => specifier.replace(/\\/gu, "/").split("/").pop());
}

/**
 * Finds `.svg` import specifiers (by basename) with no corresponding entry in the available
 * files collection.
 *
 * @param {{ specifiers: string[], availableFiles: Iterable<string> }} options
 * @returns {string[]}
 */
export function findUnresolvedSvgImports({ specifiers, availableFiles }) {
    const available = new Set(availableFiles);
    return [...new Set(extractSvgImportFileNames(specifiers))]
        .filter((fileName) => !available.has(fileName))
        .sort();
}
