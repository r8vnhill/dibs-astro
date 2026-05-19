#!/usr/bin/env node

/**
 * Process entry point for the lesson PDF exporter.
 *
 * This executable is intentionally thin. It only resolves the project root, parses process arguments, delegates export 
 * orchestration, and translates unexpected failures into a non-zero process exit code.
 *
 * CLI parsing and export behavior live under `scripts/lib/pdf-export` so they can be tested without invoking Node 
 * process globals such as `process.argv`, `console.error`, or `process.exitCode`.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseCliArgs } from "./lib/pdf-export/cli.mjs";
import { runPdfExport } from "./lib/pdf-export/runner.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const main = async () => {
    const options = parseCliArgs(process.argv.slice(2));

    await runPdfExport({
        projectRoot,
        options,
    });
};

main().catch((error) => {
    console.error("[export-lessons-pdf] Unexpected error:", error);
    process.exitCode = 1;
});
