// Imperative shell: after `build`, confirms every `.svg` import specifier in the built
// `dist/index.js` module resolves to a file actually packaged alongside it. This is the
// complementary direction to `pack:check`'s `comparePublishedSvgSet` (which confirms every
// packaged SVG is approved by the release plan) -- this script confirms every referenced SVG is
// actually packaged. Uses `es-module-lexer` to read semantic import specifiers rather than a
// textual regex parser.

import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { init, parse } from "es-module-lexer";

import { findUnresolvedSvgImports } from "./lib/artifact-integrity.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_BUNDLE_PATH = resolve(packageRoot, "dist", "index.js");
const DEFAULT_DIST_DIR = resolve(packageRoot, "dist");

const defaultDependencies = Object.freeze({
    readBundleSource: () => readFile(DEFAULT_BUNDLE_PATH, "utf8"),
    readDistFiles: () => readdir(DEFAULT_DIST_DIR),
    writeDiagnostic: (message) => console.error(message),
    writeOutput: (message) => console.log(message),
});

/**
 * Parses a module's source and returns its raw import specifiers.
 *
 * @param {string} source
 * @returns {Promise<string[]>}
 */
export async function extractImportSpecifiers(source) {
    await init;
    const [imports] = parse(source);
    return imports.map((entry) => entry.n).filter((specifier) => typeof specifier === "string");
}

/**
 * CLI entry point.
 *
 * @param {{ dependencies?: object }} options
 * @returns {Promise<number>}
 */
export async function main({ dependencies = defaultDependencies } = {}) {
    const [source, availableFiles] = await Promise.all([
        dependencies.readBundleSource(),
        dependencies.readDistFiles(),
    ]);

    const specifiers = await extractImportSpecifiers(source);
    const unresolved = findUnresolvedSvgImports({ specifiers, availableFiles });

    if (unresolved.length > 0) {
        dependencies.writeDiagnostic(
            `Unresolved SVG import specifier(s) in dist/index.js:\n${
                unresolved.map((fileName) => `  - ${fileName}`).join("\n")
            }`,
        );
        return 1;
    }

    const svgImportCount = specifiers.filter((specifier) => specifier.endsWith(".svg")).length;
    dependencies.writeOutput(
        `✓ Artifact integrity check passed: ${svgImportCount} SVG import(s) all resolve to packaged files.`,
    );
    return 0;
}

const scriptPath = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] && resolve(process.argv[1]) === scriptPath;

if (isMainModule) {
    process.exitCode = await main();
}
