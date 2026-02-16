/**
 * @file generate-lesson-metadata.mjs
 *
 * CLI entry point for generating lesson metadata.
 *
 * This script is a thin wrapper around {@link generateLessonMetadata} from
 * `lesson-metadata/generator.js`.
 *
 * Its responsibilities are intentionally minimal:
 *
 * - Resolve project-relative paths.
 * - Parse CLI flags (`--dry-run`, `--quiet`).
 * - Invoke the generator with the correct configuration.
 * - Print a concise summary (unless quiet).
 * - Exit with a non-zero code on unexpected failure.
 *
 * ## Usage
 *
 * From the project root:
 *
 * ```bash
 * node scripts/generate-lesson-metadata.mjs
 * ```
 *
 * ### Flags
 *
 * - `--dry-run`
 *   - Computes metadata and statistics.
 *   - Does **not** write the generated JSON file.
 *   - Useful in CI to validate configuration without mutating the repository.
 * - `--quiet`
 *   - Suppresses non-critical logs and warnings.
 *   - Only fatal errors will be printed.
 *
 * ## Example
 *
 * ```bash
 * node scripts/generate-lesson-metadata.mjs --dry-run --quiet
 * ```
 *
 * ## Expected project structure
 *
 * The script assumes:
 *
 * - **Authors mapping** --- `src/data/lesson-authors.json`
 * - **Generator configuration** --- `src/data/lesson-metadata.config.json`
 * - **Output file** --- `src/data/lesson-metadata.generated.json`
 *
 * If any of these paths change, update the constants below.
 *
 * ## Error handling
 *
 * - Configuration errors (e.g. missing `fallbackAuthorName`) will cause `generateLessonMetadata`
 *   to throw.
 * - Unexpected runtime failures are caught at the top level, logged to stderr, and the process
 *   exit code is set to `1`.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    generateLessonMetadata,
    parseArgs,
} from "../src/lib/lesson-metadata/generator.js";

/**
 * Resolve the absolute path to this file in ESM.
 *
 * Node ESM does not expose `__dirname` and `__filename` by default, so we reconstruct them from
 * `import.meta.url`.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Root of the project (one level above the `scripts/` directory).
 *
 * All file paths used by the generator are resolved relative to this root.
 */
const projectRoot = path.resolve(__dirname, "..");

/**
 * Path to the authors mapping JSON file.
 *
 * Expected shape:
 *
 * ```json
 * {
 *   "/notes/example/": [{ "name": "Author Name" }]
 * }
 * ```
 */
const authorsPath = path.join(projectRoot, "src/data/lesson-authors.json");

/**
 * Path to the generator configuration file.
 *
 * Must contain:
 *
 * ```json
 * {
 *   "fallbackAuthorName": "Default Author"
 * }
 * ```
 */
const configPath = path.join(
    projectRoot,
    "src/data/lesson-metadata.config.json",
);

/**
 * Path where the generated metadata JSON will be written.
 *
 * The write is atomic (via a temporary file + rename), unless `--dry-run` is provided.
 */
const outputPath = path.join(
    projectRoot,
    "src/data/lesson-metadata.generated.json",
);

/**
 * Main CLI workflow.
 *
 * ## Steps:
 *
 * 1. Parse CLI flags.
 * 2. Invoke {@link generateLessonMetadata}.
 * 3. Print a short summary (unless `--quiet`).
 */
const main = async () => {
    const { dryRun, quiet } = parseArgs(process.argv.slice(2));

    const { output, stats } = await generateLessonMetadata({
        projectRoot,
        authorsPath,
        configPath,
        outputPath,
        dryRun,
        quiet,
    });

    if (!quiet) {
        const action = dryRun ? "Simulated" : "Generated";

        console.log(
            `[lesson-metadata] ${action} ${path.relative(
                projectRoot,
                outputPath,
            )} with ${output.totalLessons} lessons.`,
        );

        console.log(
            `[lesson-metadata] Stats: no_changes=${stats.zeroChangesCount}, missing_author_mapping=${stats.missingAuthorsMappingCount}.`,
        );
    }
};

/**
 * Top-level execution with guarded error handling.
 *
 * Any unexpected exception:
 *
 * - Is logged with a consistent prefix.
 * - Causes the process to exit with code `1`.
 */
main().catch((error) => {
    console.error("[lesson-metadata] Unexpected error:", error);
    process.exitCode = 1;
});
