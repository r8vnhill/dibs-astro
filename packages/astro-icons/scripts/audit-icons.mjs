// Thin CLI orchestration layer: connects the pure inventory model to the flat source
// directory and provides deterministic --write and --check workflows.

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
    buildIconInventory,
    IconInventoryError,
} from "./lib/icon-inventory.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const DEFAULT_SOURCE_DIR = resolve(packageRoot, "src");
export const DEFAULT_ARTIFACT_PATH = resolve(
    packageRoot,
    "migration",
    "icon-inventory.json",
);

const SCHEMA_VERSION = 1;

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

/**
 * Lists the direct .svg filenames in a flat directory, lexically sorted.
 *
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
export async function scanSvgDirectory(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".svg"))
        .map((entry) => entry.name)
        .sort();
}

function buildArtifact(filenames, customBaseNames) {
    const { icons, counts } = buildIconInventory(filenames, customBaseNames);

    return {
        schemaVersion: SCHEMA_VERSION,
        package: {
            currentName: "@ravenhill/astro-icons",
            historicalName: "@ravenhill/phosphor-icons",
            note: "The package is already named @ravenhill/astro-icons in this monorepo; the historical transition is recorded for the standalone migration.",
        },
        sourceDirectory: "packages/astro-icons/src",
        classification: {
            strategy: "explicit-custom-allowlist",
            customBaseNames: [...customBaseNames].sort(),
        },
        exportContract: {
            convention: "PascalCase via the shared toPascalCase function",
        },
        counts,
        icons,
    };
}

/**
 * Deterministically serializes an inventory built from the given filenames: fixed property
 * order, two-space indentation, exactly one trailing line feed, no timestamps or absolute paths.
 *
 * @param {Iterable<string>} filenames
 * @param {Iterable<string>} customBaseNames
 * @returns {string}
 */
export function serializeInventory(filenames, customBaseNames) {
    const artifact = buildArtifact(filenames, customBaseNames);
    return `${JSON.stringify(artifact, null, 2)}\n`;
}

function summarize(counts) {
    return `${counts.phosphor} phosphor + ${counts.custom} custom = ${counts.total} total`;
}

/**
 * Runs the audit in either "write" or "check" mode against the given source directory and
 * artifact path. Never throws for expected audit failures; returns `{ ok, message }` instead.
 *
 * @param {{
 *   mode: "write" | "check",
 *   sourceDir: string,
 *   artifactPath: string,
 *   customBaseNames: Iterable<string>,
 * }} options
 * @returns {Promise<{ ok: boolean, message?: string, summary?: string }>}
 */
export async function runAudit({
    mode,
    sourceDir,
    artifactPath,
    customBaseNames,
}) {
    let filenames;
    try {
        filenames = await scanSvgDirectory(sourceDir);
    } catch (error) {
        return {
            ok: false,
            message: `Unable to read source directory: ${error.message}`,
        };
    }

    let serialized;
    try {
        serialized = serializeInventory(filenames, customBaseNames);
    } catch (error) {
        if (error instanceof IconInventoryError) {
            return { ok: false, message: error.message };
        }
        throw error;
    }

    const { counts } = buildIconInventory(filenames, customBaseNames);
    const summary = summarize(counts);

    if (mode === "write") {
        await mkdir(dirname(artifactPath), { recursive: true });
        await writeFile(artifactPath, serialized, "utf8");
        return { ok: true, summary };
    }

    // mode === "check"
    let committed;
    try {
        committed = await readFile(artifactPath, "utf8");
    } catch {
        return {
            ok: false,
            message: `Missing committed artifact at ${artifactPath}. Run audit-icons:update to generate it.`,
        };
    }

    if (committed !== serialized) {
        return {
            ok: false,
            message: `Committed artifact at ${artifactPath} is stale. Run audit-icons:update to regenerate it.`,
        };
    }

    return { ok: true, summary };
}

function parseArgs(argv) {
    const write = argv.includes("--write");
    const check = argv.includes("--check");
    const known = new Set(["--write", "--check"]);
    const unknown = argv.filter((arg) => !known.has(arg));

    if (unknown.length > 0) {
        return { error: `Unknown argument(s): ${unknown.join(", ")}` };
    }
    if (write && check) {
        return { error: "Pass exactly one of --write or --check, not both." };
    }
    if (!write && !check) {
        return { error: "Pass exactly one mode: --write or --check." };
    }

    return { mode: write ? "write" : "check" };
}

async function main() {
    const parsed = parseArgs(process.argv.slice(2));
    if (parsed.error) {
        console.error(parsed.error);
        process.exitCode = 1;
        return;
    }

    const result = await runAudit({
        mode: parsed.mode,
        sourceDir: DEFAULT_SOURCE_DIR,
        artifactPath: DEFAULT_ARTIFACT_PATH,
        customBaseNames: CUSTOM_BASE_NAMES,
    });

    if (!result.ok) {
        console.error(result.message);
        process.exitCode = 1;
        return;
    }

    console.log(result.summary);
}

const isMainModule =
    process.argv[1] &&
    resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
    await main();
}
