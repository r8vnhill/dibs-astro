import fg from "fast-glob";
import { execFile } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { buildLessonMetadataEntry, parseGitLogOutput } from "./git-metadata.js";

/**
 * Glob pattern used to discover lesson source files.
 *
 * By default, lessons are expected to live under:
 *
 * - `src/pages/notes/`
 *
 * and to be written as `.astro` files. The generator resolves routes relative to
 * {@link PAGES_ROOT}, so this glob should remain consistent with that root.
 *
 * ## Example matches:
 *
 * - `src/pages/notes/foo.astro`
 * - `src/pages/notes/bar/index.astro`
 */
export const LESSON_GLOB = "src/pages/notes/**/*.astro";

/**
 * Root directory used to derive public lesson routes.
 *
 * This value must match the directory structure expected by `buildLessonMetadataEntry` (in
 * `git-metadata.js`).
 *
 * ## For example:
 *
 * - `src/pages/notes/example.astro` -> `/notes/example/`
 *
 * If your project changes its routing root (e.g. `src/content`), this constant must be updated
 * accordingly.
 */
export const PAGES_ROOT = "src/pages";

/**
 * Maximum number of Git changes retained per lesson.
 *
 * The generator reads the full Git history for a file but truncates the resulting list to this
 * limit.
 *
 * This keeps:
 *
 * - Output size manageable.
 * - Metadata focused on recent changes.
 *
 * Set to a higher number if you need deeper historical context.
 */
export const CHANGES_LIMIT = 5;

/**
 * Field delimiter used when parsing `git log` output.
 *
 * The generator uses a NUL character (`\u0000`) emitted via `%x00` in the Git pretty format:
 *
 * ```
 * --pretty=format:%H%x00%ad%x00%an%x00%s
 * ```
 *
 * ## Why NUL?
 *
 * - Extremely unlikely to appear in commit messages.
 * - Avoids ambiguity caused by characters like `|`.
 * - Makes parsing deterministic and robust.
 */
export const GIT_FIELD_DELIMITER = "\u0000";

/**
 * Default maximum number of concurrent Git processes.
 *
 * Git history extraction is I/O-bound and can safely run in parallel. However, excessive
 * parallelism may:
 *
 * - Overload slower machines.
 * - Cause unnecessary CPU spikes in CI.
 *
 * This value provides a balanced default and can be overridden when calling
 * `generateLessonMetadata`.
 */
export const DEFAULT_CONCURRENCY = 6;

/**
 * Promisified version of Node’s `execFile`.
 *
 * Used internally to invoke:
 *
 * - `git log`
 *
 * Wrapping `execFile` with `promisify` allows the rest of the generator to use `async/await`
 * consistently without introducing external dependencies such as `execa`.
 *
 * ## Signature:
 *
 * ```ts
 * execFileAsync(cmd, args, options) -> Promise<{ stdout: string, stderr: string }>
 * ```
 */
const execFileAsync = promisify(execFile);

/**
 * Parses CLI flags used by the generator wrapper script.
 *
 * ## Supported flags:
 *
 * - `--dry-run`: compute output without writing the generated file.
 * - `--quiet`: suppress warning/info logs.
 */
export const parseArgs = (argv) => ({
    dryRun: argv.includes("--dry-run"),
    quiet: argv.includes("--quiet"),
});

/**
 * Emits a warning unless quiet mode is enabled.
 */
export const warn = (message, quiet, warnFn = console.warn) => {
    if (!quiet) warnFn(message);
};

/**
 * Reads and parses a JSON file.
 *
 * Throws if the file is missing or contains invalid JSON.
 */
export const loadJsonFile = async (filePath) => {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
};

/**
 * Loads the authors mapping file.
 *
 * ## Expected shape:
 *
 * - object keyed by lesson route
 * - values are arrays of author entries
 *
 * On error or invalid root shape, returns an empty mapping and warns.
 */
export const readAuthorsByPath = async ({
    authorsPath,
    loadJson = loadJsonFile,
    quiet = false,
    warnFn = console.warn,
}) => {
    try {
        const parsed = await loadJson(authorsPath);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            warn(
                "[lesson-metadata] lesson-authors.json is not an object. Using empty mapping.",
                quiet,
                warnFn,
            );
            return {};
        }
        return parsed;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warn(
            `[lesson-metadata] Could not read lesson-authors.json. Using empty mapping. Cause: ${message}`,
            quiet,
            warnFn,
        );
        return {};
    }
};

/**
 * Loads generator config and validates `fallbackAuthorName`.
 *
 * Throws a friendly error with root cause context when invalid.
 */
export const readGeneratorConfig = async ({ configPath, loadJson = loadJsonFile }) => {
    try {
        const parsed = await loadJson(configPath);
        if (typeof parsed?.fallbackAuthorName === "string" && parsed.fallbackAuthorName.trim()) {
            return { fallbackAuthorName: parsed.fallbackAuthorName.trim() };
        }
        throw new Error("fallbackAuthorName is missing or empty.");
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
            `Could not load src/data/lesson-metadata.config.json with a valid fallbackAuthorName. Cause: ${message}`,
        );
    }
};

/**
 * Discovers lesson files and returns a deterministic order.
 */
export const getLessonFiles = async ({ lessonGlob = LESSON_GLOB, cwd, globFn = fg }) => {
    const files = await globFn(lessonGlob, { cwd, absolute: false });
    return [...files].sort((a, b) => a.localeCompare(b));
};

/**
 * Reads git history for one source file.
 *
 * ## Uses:
 *
 * - `git log --follow`
 * - `--date=short` for deterministic `YYYY-MM-DD` dates
 * - NUL-separated fields for robust parsing
 *
 * Returns an empty change list when git fails.
 */
export const getChanges = async ({
    sourceFile,
    cwd,
    quiet = false,
    warnFn = console.warn,
    changesLimit = CHANGES_LIMIT,
    delimiter = GIT_FIELD_DELIMITER,
    execFileFn = execFileAsync,
}) => {
    try {
        const { stdout } = await execFileFn(
            "git",
            [
                "log",
                "--follow",
                "--date=short",
                "--pretty=format:%H%x00%ad%x00%an%x00%s",
                "--",
                sourceFile,
            ],
            { cwd, encoding: "utf8" },
        );
        return parseGitLogOutput(stdout, delimiter).slice(0, changesLimit);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warn(
            `[lesson-metadata] Could not read git log for ${sourceFile}: ${message}`,
            quiet,
            warnFn,
        );
        return [];
    }
};

/**
 * Creates a small async concurrency limiter.
 *
 * Useful to cap concurrent git subprocesses while keeping throughput reasonable.
 */
export const createLimiter = (maxConcurrent) => {
    let active = 0;
    const queue = [];

    const next = () => {
        if (active >= maxConcurrent || queue.length === 0) return;
        const run = queue.shift();
        if (!run) return;
        active += 1;
        run();
    };

    return (fn) =>
        new Promise((resolve, reject) => {
            queue.push(async () => {
                try {
                    resolve(await fn());
                } catch (error) {
                    reject(error);
                } finally {
                    active -= 1;
                    next();
                }
            });
            next();
        });
};

/**
 * Builds one lesson metadata entry from source file, git changes, and config.
 */
export const makeEntry = ({ sourceFile, changes, authorsByPath, config }) =>
    buildLessonMetadataEntry(
        sourceFile,
        changes,
        authorsByPath,
        PAGES_ROOT,
        config.fallbackAuthorName,
    );

/**
 * Builds deterministic output payload with sorted entry keys.
 */
export const buildOutput = ({
    entries,
    changesLimit = CHANGES_LIMIT,
    now = () => new Date().toISOString(),
}) => {
    const sortedKeys = Object.keys(entries).sort((a, b) => a.localeCompare(b));
    const sortedEntries = Object.fromEntries(sortedKeys.map((key) => [key, entries[key]]));
    return {
        generatedAt: now(),
        totalLessons: sortedKeys.length,
        changesLimit,
        entries: sortedEntries,
    };
};

/**
 * Writes output JSON atomically (`.tmp` then rename), unless dry-run mode is enabled.
 */
export const writeOutput = async ({
    output,
    outputPath,
    dryRun = false,
    mkdirFn = mkdir,
    writeFileFn = writeFile,
    renameFn = rename,
}) => {
    if (dryRun) return;
    await mkdirFn(path.dirname(outputPath), { recursive: true });
    const tempPath = `${outputPath}.tmp`;
    await writeFileFn(tempPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    await renameFn(tempPath, outputPath);
};

/**
 * Computes summary stats for logs:
 * - lessons with zero changes
 * - lessons missing explicit author mapping
 */
export const computeStats = ({ entries, authorsByPath }) => {
    let zeroChangesCount = 0;
    let missingAuthorsMappingCount = 0;

    for (const [route, entry] of Object.entries(entries)) {
        if (!entry.changes || entry.changes.length === 0) {
            zeroChangesCount += 1;
        }
        const mappedAuthors = authorsByPath[route];
        if (!Array.isArray(mappedAuthors) || mappedAuthors.length === 0) {
            missingAuthorsMappingCount += 1;
        }
    }
    return { zeroChangesCount, missingAuthorsMappingCount };
};

/**
 * Main orchestration entry point used by the CLI wrapper.
 *
 * ## Flow:
 *
 * 1. Discover lessons
 * 2. Load authors/config
 * 3. Read changes concurrently (bounded)
 * 4. Assemble entries
 * 5. Write output (or skip in dry-run)
 * 6. Return output + stats
 */
export const generateLessonMetadata = async ({
    projectRoot,
    authorsPath,
    configPath,
    outputPath,
    lessonGlob = LESSON_GLOB,
    quiet = false,
    dryRun = false,
    concurrency = DEFAULT_CONCURRENCY,
    warnFn = console.warn,
}) => {
    const [lessonFiles, authorsByPath, config] = await Promise.all([
        getLessonFiles({ lessonGlob, cwd: projectRoot }),
        readAuthorsByPath({ authorsPath, quiet, warnFn }),
        readGeneratorConfig({ configPath }),
    ]);
    const limit = createLimiter(concurrency);

    const entries = {};
    const tasks = lessonFiles.map((sourceFile) =>
        limit(async () => {
            const changes = await getChanges({ sourceFile, cwd: projectRoot, quiet, warnFn });
            const entry = makeEntry({ sourceFile, changes, authorsByPath, config });
            return { entry };
        })
    );

    const resolved = await Promise.all(tasks);
    for (const { entry } of resolved) {
        if (!entry) {
            continue;
        }
        entries[entry.path] = {
            sourceFile: entry.sourceFile,
            authors: entry.authors,
            ...(entry.lastModified ? { lastModified: entry.lastModified } : {}),
            changes: entry.changes,
        };
    }

    const output = buildOutput({ entries });
    await writeOutput({ output, outputPath, dryRun });
    const stats = computeStats({ entries, authorsByPath });
    return { output, stats };
};
