import { spawn } from "node:child_process";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const packageRoot = resolve(dirname(scriptPath), "..");
const repoRoot = resolve(packageRoot, "..", "..");
const args = new Set(process.argv.slice(2).filter((arg) => arg !== "--"));
const keepTemp = args.has("--keep-temp");
const verbose = args.has("--verbose");

if ([...args].some((arg) => arg !== "--keep-temp" && arg !== "--verbose")) {
    throw new Error("Supported flags are --keep-temp and --verbose.");
}

async function main() {
    const tempRoot = await mkdtemp(join(tmpdir(), "lesson-export-core-consumer-"));
    let tarballPath;

    try {
        assertOutsideRepository(tempRoot);
        await runPackageBuild();
        tarballPath = await packPackage();
        await writeConsumerProject(tempRoot, tarballPath);
        await run("npm", ["install", "--ignore-scripts", tarballPath], { cwd: tempRoot });
        await run("node", ["runtime-consumer.mjs"], { cwd: tempRoot });
        await run("node", ["subpath-runtime-consumer.mjs"], { cwd: tempRoot });
        await runTypeScriptCheck(tempRoot);
    } finally {
        if (keepTemp) {
            console.log(`Keeping temporary consumer at ${tempRoot}`);
        } else {
            await rm(tempRoot, { force: true, recursive: true });
        }

        if (tarballPath) {
            await rm(tarballPath, { force: true });
        }
    }
}

async function packPackage() {
    const output = await run("npm", ["pack", "--json"], { cwd: packageRoot, capture: true });
    const entries = JSON.parse(output);
    if (!Array.isArray(entries) || entries.length !== 1) {
        throw new Error(`Expected one npm pack result, received ${Array.isArray(entries) ? entries.length : 0}.`);
    }

    const [{ filename }] = entries;
    if (typeof filename !== "string" || filename.length === 0) {
        throw new Error("npm pack did not report a tarball filename.");
    }

    const resolvedTarballPath = resolve(packageRoot, filename);
    await access(resolvedTarballPath);
    return resolvedTarballPath;
}

async function runPackageBuild() {
    const tsupCliPath = join(repoRoot, "node_modules", "tsup", "dist", "cli-default.js");
    try {
        await access(tsupCliPath);
    } catch {
        throw new Error(`tsup CLI not found at ${tsupCliPath}. Run pnpm install before consumer validation.`);
    }

    await run("node", [tsupCliPath], { cwd: packageRoot });
}

async function writeConsumerProject(consumerRoot, dependencyPath) {
    await writeJson(join(consumerRoot, "package.json"), {
        private: true,
        type: "module",
        dependencies: {
            "@ravenhill/lesson-export-core": `file:${dependencyPath}`,
        },
    });

    await writeJson(join(consumerRoot, "tsconfig.json"), {
        compilerOptions: {
            target: "ES2022",
            module: "NodeNext",
            moduleResolution: "NodeNext",
            strict: true,
            skipLibCheck: false,
            noEmit: true,
        },
        include: ["*.ts"],
    });

    await writeFile(join(consumerRoot, "runtime-consumer.mjs"), runtimeConsumerSource);
    await writeFile(join(consumerRoot, "subpath-runtime-consumer.mjs"), subpathRuntimeConsumerSource);
    await writeFile(join(consumerRoot, "type-consumer.ts"), typeConsumerSource);
    await writeFile(join(consumerRoot, "subpath-type-consumer.ts"), subpathTypeConsumerSource);
}

async function runTypeScriptCheck(consumerRoot) {
    const tscPath = join(repoRoot, "node_modules", "typescript", "bin", "tsc");
    try {
        await access(tscPath);
    } catch {
        throw new Error(`TypeScript binary not found at ${tscPath}. Run pnpm install before consumer validation.`);
    }

    await run("node", [tscPath, "-p", "tsconfig.json"], { cwd: consumerRoot });
}

async function writeJson(filePath, value) {
    await writeFile(`${filePath}`, `${JSON.stringify(value, null, 4)}\n`);
}

function assertOutsideRepository(directory) {
    const relativePath = relative(repoRoot, directory);
    if (relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath))) {
        throw new Error(`Temporary consumer must be outside the repository: ${directory}`);
    }
}

function run(command, commandArgs, options = {}) {
    const { capture = false, cwd = repoRoot } = options;
    if (verbose) {
        console.log(`$ ${command} ${commandArgs.join(" ")}\n  cwd: ${cwd}`);
    }

    return new Promise((resolvePromise, reject) => {
        const child = spawnCommand(command, commandArgs, cwd, capture);

        let stdout = "";
        let stderr = "";
        if (capture) {
            child.stdout.on("data", (chunk) => {
                stdout += chunk;
            });
            child.stderr.on("data", (chunk) => {
                stderr += chunk;
            });
        }

        child.on("error", reject);
        child.on("close", (code) => {
            if (code === 0) {
                resolvePromise(stdout);
                return;
            }

            const captured = [stdout, stderr].filter((output) => capture && output.trim().length > 0).join("\n");
            const details = captured.length > 0 ? `\n${captured}` : "";
            reject(new Error(`Command failed with exit code ${code}: ${command} ${commandArgs.join(" ")}${details}`));
        });
    });
}

function spawnCommand(command, commandArgs, cwd, capture) {
    const stdio = capture ? ["ignore", "pipe", "pipe"] : "inherit";
    const env = command === "npm" ? sanitizeNpmEnvironment() : process.env;
    if (command === "node") {
        return spawn(process.execPath, commandArgs, { cwd, env, stdio });
    }

    if (process.platform !== "win32") {
        return spawn(command, commandArgs, { cwd, env, stdio });
    }

    const executable = command === "npm" ? "npm.cmd" : command;
    return spawn("cmd.exe", ["/d", "/c", [executable, ...commandArgs.map(quoteShellArgument)].join(" ")], {
        cwd,
        env,
        stdio,
    });
}

function sanitizeNpmEnvironment() {
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
        if (key.toLowerCase().startsWith("npm_config_")) {
            delete env[key];
        }
    }

    return env;
}

function quoteShellArgument(value) {
    const text = String(value);
    return /[\s"&|<>^]/u.test(text) ? `"${text.replace(/"/g, "\\\"")}"` : text;
}

const runtimeConsumerSource = String.raw`import {
    LESSON_EXPORT_CORE_PACKAGE_NAME,
    LESSON_EXPORT_CORE_VERSION,
    buildExportSummary,
    countEntriesByStatus,
    countFailuresByKind,
    countFindingsByKind,
    deriveExportRoute,
    derivePdfOutputPath,
    filterManifest,
    hasFatalExportFindings,
    normalizeLessonRoute,
    validateManifest,
} from "@ravenhill/lesson-export-core";

if (LESSON_EXPORT_CORE_PACKAGE_NAME !== "@ravenhill/lesson-export-core") {
    throw new Error("Unexpected package name.");
}

if (!/^\d+\.\d+\.\d+$/u.test(LESSON_EXPORT_CORE_VERSION)) {
    throw new Error("Unexpected package version: " + LESSON_EXPORT_CORE_VERSION);
}

const route = normalizeLessonRoute("notes/kousei-arima");
if (route !== "/notes/kousei-arima/") {
    throw new Error("normalizeLessonRoute returned an unexpected route.");
}

if (deriveExportRoute(route) !== "/exports/pdf/notes/kousei-arima/") {
    throw new Error("deriveExportRoute returned an unexpected route.");
}

if (derivePdfOutputPath(route) !== "notes/kousei-arima/index.pdf") {
    throw new Error("derivePdfOutputPath returned an unexpected path.");
}

const manifest = {
    generatedAt: "2026-05-10T00:00:00.000Z",
    entries: [{
        route,
        exportRoute: deriveExportRoute(route),
        title: "Kousei Arima",
        sourceFile: "src/pages/notes/kousei-arima/index.astro",
        outputPath: derivePdfOutputPath(route),
    }],
};

if (filterManifest(manifest, { kind: "all" }).entries.length !== 1) {
    throw new Error("filterManifest returned an unexpected entry count.");
}

if (!validateManifest(manifest).valid) {
    throw new Error("validateManifest returned an unexpected finding.");
}

const reportEntries = [
    {
        status: "exported",
        findings: [{ kind: "client-only-island" }],
    },
    {
        status: "failed",
        findings: [{ code: "hidden-content" }],
        error: { kind: "pdf-generation-failed" },
    },
    {
        status: "skipped",
        findings: [],
    },
];

const statusCounts = countEntriesByStatus(reportEntries);
if (statusCounts.exported !== 1 || statusCounts.failed !== 1 || statusCounts.skipped !== 1) {
    throw new Error("countEntriesByStatus returned unexpected counts.");
}

const findingsByKind = countFindingsByKind(reportEntries);
if (findingsByKind["client-only-island"] !== 1 || findingsByKind["hidden-content"] !== 1) {
    throw new Error("countFindingsByKind returned unexpected counts.");
}

const failuresByKind = countFailuresByKind(reportEntries);
if (failuresByKind["pdf-generation-failed"] !== 1) {
    throw new Error("countFailuresByKind returned unexpected counts.");
}

const summary = buildExportSummary(reportEntries);
if (summary.selected !== 3 || summary.findings !== 2 || summary.failed !== 1) {
    throw new Error("buildExportSummary returned an unexpected summary.");
}

if (!hasFatalExportFindings(reportEntries, ["client-only"])) {
    throw new Error("hasFatalExportFindings did not normalize a legacy fatal policy kind.");
}

if (hasFatalExportFindings(reportEntries, ["unresolved-todo"])) {
    throw new Error("hasFatalExportFindings matched an absent fatal policy kind.");
}
`;

const subpathRuntimeConsumerSource = String.raw`const blockedSubpaths = [
    "@ravenhill/lesson-export-core/findings",
    "@ravenhill/lesson-export-core/reporting",
    "@ravenhill/lesson-export-core/routes",
    "@ravenhill/lesson-export-core/src/findings",
    "@ravenhill/lesson-export-core/src/index.js",
    "@ravenhill/lesson-export-core/src/reporting",
    "@ravenhill/lesson-export-core/dist/findings",
    "@ravenhill/lesson-export-core/dist/index.js",
    "@ravenhill/lesson-export-core/dist/reporting",
];

for (const specifier of blockedSubpaths) {
    try {
        await import(specifier);
    } catch (error) {
        if (error?.code === "ERR_PACKAGE_PATH_NOT_EXPORTED" || error?.code === "ERR_MODULE_NOT_FOUND") {
            continue;
        }

        throw new Error("Subpath " + specifier + " failed with an unexpected error: " + (error?.message ?? error));
    }

    throw new Error("Subpath " + specifier + " unexpectedly resolved.");
}
`;

const typeConsumerSource = String.raw`import {
    buildExportSummary,
    countEntriesByStatus,
    countFailuresByKind,
    countFindingsByKind,
    deriveExportRoute,
    derivePdfOutputPath,
    hasFatalExportFindings,
    normalizeLessonRoute,
    type LessonExportEntry,
    type LessonExportFailurePolicy,
    type LessonExportManifest,
    type LessonExportReportEntryLike,
    type LessonExportSummary,
} from "@ravenhill/lesson-export-core";

const route = normalizeLessonRoute("notes/kousei-arima");
const entry: LessonExportEntry = {
    route,
    exportRoute: deriveExportRoute(route),
    title: "Kousei Arima",
    sourceFile: "src/pages/notes/kousei-arima.astro",
    outputPath: derivePdfOutputPath(route),
};
const manifest: LessonExportManifest = {
    generatedAt: "2026-05-10T00:00:00.000Z",
    entries: [entry],
};

const reportEntries: readonly LessonExportReportEntryLike[] = [
    {
        status: "exported",
        findings: [{ kind: "client-only-island" }],
    },
    {
        status: "failed",
        error: { kind: "pdf-generation-failed" },
    },
];
const summary: LessonExportSummary = buildExportSummary(reportEntries);
const failOn: LessonExportFailurePolicy = ["client-only"];

countEntriesByStatus(reportEntries);
countFindingsByKind(reportEntries);
countFailuresByKind(reportEntries);
hasFatalExportFindings(reportEntries, failOn);
void manifest;
void summary;
`;

const subpathTypeConsumerSource = String.raw`// @ts-expect-error Subpath imports are intentionally unsupported.
import("@ravenhill/lesson-export-core/findings");
// @ts-expect-error Subpath imports are intentionally unsupported.
import("@ravenhill/lesson-export-core/reporting");
// @ts-expect-error Subpath imports are intentionally unsupported.
import("@ravenhill/lesson-export-core/routes");
`;

await main();
