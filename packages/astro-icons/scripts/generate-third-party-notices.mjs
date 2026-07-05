// Notice generation entry point: pure renderers first, then thin CLI orchestration.

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateManifest } from "./lib/license-metadata.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");

export const DEFAULT_MANIFEST_PATH = resolve(
    packageRoot,
    "LICENSES",
    "third-party-icons.json",
);
export const DEFAULT_INVENTORY_PATH = resolve(
    packageRoot,
    "migration",
    "icon-inventory.json",
);
export const DEFAULT_NOTICE_PATH = resolve(
    packageRoot,
    "LICENSES",
    "THIRD_PARTY.md",
);
export const DEFAULT_LICENSES_DIR = resolve(packageRoot, "LICENSES");

const withSingleTrailingNewline = (value) => `${value.replace(/\n+$/u, "")}\n`;

const getRenderableAssets = (manifest) =>
    Array.isArray(manifest?.assets) ? manifest.assets : [];

/**
 * Renders trademark information only when the manifest asserts trademark applicability.
 *
 * @param {{ applies?: string, owner?: string|null, policyUrl?: string|null, notes?: string|null }} trademark
 * @returns {string}
 */
export function renderTrademarkNotice(trademark) {
    if (!trademark || trademark.applies !== "yes") {
        return "";
    }

    const parts = [];
    if (trademark.owner) {
        parts.push(`Trademark: ${trademark.owner}.`);
    }
    if (trademark.policyUrl) {
        parts.push(`Policy: ${trademark.policyUrl}.`);
    }
    if (trademark.notes) {
        parts.push(`Notes: ${trademark.notes}.`);
    }

    return parts.join(" ");
}

/**
 * Renders a single non-Phosphor asset section using conservative, manifest-literal wording.
 *
 * @param {object} asset
 * @returns {string}
 */
export function renderAssetSection(asset) {
    const lines = [
        `## ${asset.displayName}`,
        "",
        `- File: \`${asset.file}\``,
        `- Asset type: ${asset.assetType}`,
        `- Copyright conclusion: ${asset.rights?.copyright?.concludedLicense}`,
    ];

    if (asset.rights?.copyright?.basis) {
        lines.push(`- Copyright basis: ${asset.rights.copyright.basis}`);
    }

    lines.push(
        `- Redistribution conclusion: ${asset.redistribution?.conclusion}`,
        `- Recorded release decision: ${asset.releaseDecision?.action}`,
    );

    const trademarkNotice = renderTrademarkNotice(asset.rights?.trademark);
    if (trademarkNotice) {
        lines.push(`- ${trademarkNotice}`);
    }

    return lines.join("\n");
}

/**
 * Renders the Phosphor attribution section, stating source evidence status honestly rather than
 * implying a verified upstream commit when none exists.
 *
 * @param {object} phosphor
 * @returns {string}
 */
export const renderPhosphorSection = (phosphor) =>
    [
        `## ${phosphor.project}`,
        "",
        `- Concluded license: ${phosphor.copyright?.concludedLicense}`,
        `- Copyright notice: ${phosphor.copyright?.copyrightNotice}`,
        `- Source evidence status: ${phosphor.source?.evidenceStatus}.`,
        "- See LICENSES/PHOSPHOR.txt for the full notice.",
    ].join("\n");

/**
 * Renders the complete deterministic third-party notice: a fixed title, the Phosphor section,
 * then one section per manifest asset sorted by file name.
 *
 * @param {object} manifest
 * @returns {string}
 */
export function renderThirdPartyNotice(manifest) {
    const assets = [...getRenderableAssets(manifest)].sort((a, b) =>
        a.file.localeCompare(b.file),
    );

    const sections = [
        "# Third-Party Notices",
        "",
        renderPhosphorSection(manifest.phosphor),
        "",
        ...assets.flatMap((asset) => [renderAssetSection(asset), ""]),
    ];

    return withSingleTrailingNewline(sections.join("\n"));
}

/**
 * Parses the two supported CLI modes without performing I/O or exiting.
 *
 * @param {string[]} argv
 * @returns {{ mode: "write" | "check" } | { error: string }}
 */
export function parseArgs(argv) {
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

const readJsonFile = async (path) => JSON.parse(await readFile(path, "utf8"));

async function listDirectFileNames(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .sort();
}

/**
 * Reads the frozen manifest and inventory, validates them, then writes or checks the generated
 * notice. Expected failures are returned as structured results instead of exiting.
 *
 * @param {{
 *   mode: "write" | "check",
 *   manifestPath: string,
 *   inventoryPath: string,
 *   noticePath: string,
 *   licensesDir: string,
 * }} options
 * @returns {Promise<{ ok: boolean, changed?: boolean, findings?: string[], message?: string }>}
 */
export async function runGenerate({
    mode,
    manifestPath,
    inventoryPath,
    noticePath,
    licensesDir,
}) {
    const manifest = await readJsonFile(manifestPath);
    const inventory = await readJsonFile(inventoryPath);
    const licenseFileNames = await listDirectFileNames(licensesDir);
    const validation = validateManifest(inventory, manifest, licenseFileNames);

    if (!validation.ok) {
        return {
            ok: false,
            changed: false,
            findings: validation.findings,
            message: "Attribution manifest validation failed.",
        };
    }

    const expected = renderThirdPartyNotice(manifest);

    if (mode === "write") {
        await mkdir(dirname(noticePath), { recursive: true });
        await writeFile(noticePath, expected, "utf8");
        return {
            ok: true,
            changed: true,
            message: "Third-party notice updated.",
        };
    }

    let existing;
    try {
        existing = await readFile(noticePath, "utf8");
    } catch (error) {
        if (error?.code !== "ENOENT") {
            throw error;
        }
        return {
            ok: false,
            changed: false,
            findings: ["notice.missing: LICENSES/THIRD_PARTY.md is missing"],
            message: "Third-party notice is missing.",
        };
    }

    if (existing !== expected) {
        return {
            ok: false,
            changed: false,
            findings: ["notice.drift: LICENSES/THIRD_PARTY.md is stale"],
            message: "Third-party notice is out of date.",
        };
    }

    return {
        ok: true,
        changed: false,
        message: "Third-party notice is current.",
    };
}

/**
 * Runs the command-line entry point. Dependencies are injectable so tests can exercise CLI
 * behavior without shelling out or writing to the real package paths.
 *
 * @param {{
 *   argv?: string[],
 *   stdout?: (message: string) => void,
 *   stderr?: (message: string) => void,
 *   runGenerateFn?: typeof runGenerate,
 * }} options
 * @returns {Promise<void>}
 */
export async function main({
    argv = process.argv.slice(2),
    stdout = console.log,
    stderr = console.error,
    runGenerateFn = runGenerate,
} = {}) {
    const parsed = parseArgs(argv);
    if (parsed.error) {
        stderr(parsed.error);
        process.exitCode = 1;
        return;
    }

    const result = await runGenerateFn({
        mode: parsed.mode,
        manifestPath: DEFAULT_MANIFEST_PATH,
        inventoryPath: DEFAULT_INVENTORY_PATH,
        noticePath: DEFAULT_NOTICE_PATH,
        licensesDir: DEFAULT_LICENSES_DIR,
    });

    if (!result.ok) {
        stderr(result.message ?? "Third-party notice generation failed.");
        for (const finding of result.findings ?? []) {
            stderr(finding);
        }
        process.exitCode = 1;
        return;
    }

    stdout(result.message ?? "Third-party notice generation completed.");
}

const isMainModule =
    process.argv[1] &&
    resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
    await main();
}
