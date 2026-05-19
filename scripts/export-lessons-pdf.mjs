#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseCliArgs } from "./lib/pdf-export-cli.mjs";
import { runPdfExport } from "./lib/pdf-export-runner.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const main = async () => {
    const options = parseCliArgs(process.argv.slice(2));

    if (options.diagnostics.usedDeprecatedFailOnFinding) {
        process.emitWarning(
            "--fail-on-finding is deprecated. Use --fail-on <findingKind> instead.",
            {
                type: "DeprecationWarning",
                code: "DIBS_PDF_EXPORT_FAIL_ON_FINDING_DEPRECATED",
            },
        );
    }

    await runPdfExport({
        projectRoot,
        options,
    });
};

main().catch((error) => {
    console.error("[export-lessons-pdf] Unexpected error:", error);
    process.exitCode = 1;
});