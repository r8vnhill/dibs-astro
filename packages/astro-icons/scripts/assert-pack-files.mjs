import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { stdin } from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
    diffAssetFileSets,
    hasPermittedRedistribution,
    isIncludedAction,
} from "./lib/release-policy.mjs";
import { resolvePublishableIcons } from "./lib/publishable-plan.mjs";

const execFileAsync = promisify(execFile);

const scriptPath = fileURLToPath(import.meta.url);
const packageRoot = resolve(dirname(scriptPath), "..");

export const REQUIRED_RUNTIME_FILES = Object.freeze([
    "package/README.md",
    "package/package.json",
    "package/dist/index.js",
    "package/dist/index.d.ts",
    "package/dist/index.js.map",
]);

export const BLOCKED_PATTERNS = Object.freeze([
    /^package\/AGENTS\.md$/u,
    /^package\/src\//u,
    /^package\/scripts\//u,
    /^package\/migration\//u,
    /^package\/tsup\.config\.ts$/u,
    /^package\/tsconfig\.json$/u,
]);

const CORE_LICENSE_FILES = Object.freeze([
    "package/LICENSE",
    "package/LICENSES/README.md",
    "package/LICENSES/PHOSPHOR.txt",
    "package/LICENSES/THIRD_PARTY.md",
    "package/LICENSES/third-party-icons.json",
]);

const LICENSE_REFERENCE_PATHS = Object.freeze([
    Object.freeze(["rights", "copyright", "licenseFile"]),
    Object.freeze(["rights", "trademark", "licenseFile"]),
    Object.freeze(["rights", "trademark", "permissionFile"]),
    Object.freeze(["rights", "trademark", "policyFile"]),
]);

export const DEFAULT_MANIFEST_PATH = resolve(
    packageRoot,
    "LICENSES",
    "third-party-icons.json",
);

const DEFAULT_SRC_DIR = resolve(packageRoot, "src");

const defaultDependencies = Object.freeze({
    readManifest: () => readJsonFile(DEFAULT_MANIFEST_PATH),
    readPackFiles: (argv) =>
        (argv.includes("--pack") ? packPackage() : stdinToString()).then(
            (input) => ({
                files: extractPackFiles(parsePackEntries(input)),
            }),
        ),
    readPublishableIcons: () =>
        Promise.resolve(
            resolvePublishableIcons({ srcDir: DEFAULT_SRC_DIR, manifestPath: DEFAULT_MANIFEST_PATH }),
        ),
    writeDiagnostic: (message) => console.error(message),
    writeOutput: (message) => console.log(message),
});

const getManifestAssets = (manifest) => Array.isArray(manifest?.assets) ? manifest.assets : [];

const getAtPath = (object, path) =>
    path.reduce(
        (value, segment) => (value == null ? undefined : value[segment]),
        object,
    );

const toPackagePath = (path) => {
    const normalized = path.replace(/\\/gu, "/").replace(/^\.?\//u, "");
    return normalized.startsWith("package/")
        ? normalized
        : `package/${normalized}`;
};

/**
 * Derives the legal and attribution files that must be present in the published tarball.
 *
 * @param {object} manifest
 * @returns {string[]}
 */
export function deriveRequiredLicenseFiles(manifest) {
    const required = new Set(CORE_LICENSE_FILES);

    for (const asset of getManifestAssets(manifest)) {
        if (!isIncludedAction(asset)) {
            continue;
        }

        for (const path of LICENSE_REFERENCE_PATHS) {
            const reference = getAtPath(asset, path);
            if (typeof reference === "string" && reference.length > 0) {
                required.add(toPackagePath(reference));
            }
        }
    }

    return [...required].sort();
}

/**
 * Finds required files that are absent from a package file list.
 *
 * @param {Iterable<string>} files
 * @param {Iterable<string>} requiredFiles
 * @returns {string[]}
 */
export function findMissingFiles(files, requiredFiles) {
    const fileSet = new Set(files);
    return [...requiredFiles].filter((file) => !fileSet.has(file)).sort();
}

/**
 * Finds blocked files present in a package file list.
 *
 * @param {Iterable<string>} files
 * @param {RegExp[]} blockedPatterns
 * @returns {string[]}
 */
export const findBlockedFiles = (files, blockedPatterns) =>
    [...files]
        .filter((file) => blockedPatterns.some((pattern) => pattern.test(file)))
        .sort();

/**
 * Compares the actual packaged `dist/*.svg` set against the release-policy-derived publishable
 * set. Requires only the publication policy, not any source-directory knowledge.
 *
 * @param {{ files: Iterable<string>, publishableIcons: { file: string }[] }} options
 * @returns {{ missingAssets: string[], unexpectedAssets: string[] }}
 */
export function comparePublishedSvgSet({ files, publishableIcons }) {
    const expectedFiles = publishableIcons.map((icon) => `package/dist/${icon.file}`);
    const actualFiles = [...files].filter((file) => /^package\/dist\/.+\.svg$/u.test(file));
    const { missing, unexpected } = diffAssetFileSets(expectedFiles, actualFiles);

    return { missingAssets: missing, unexpectedAssets: unexpected };
}

/**
 * Finds manifest assets marked for inclusion without permitted redistribution.
 *
 * @param {object} manifest
 * @returns {string[]}
 */
export const findIncludedAssetsWithoutPermittedRedistribution = (manifest) =>
    getManifestAssets(manifest)
        .filter((asset) => isIncludedAction(asset))
        .filter((asset) => !hasPermittedRedistribution(asset))
        .map((asset) => {
            const file = asset?.file ?? "<unknown>";
            const conclusion = asset?.redistribution?.conclusion ?? "<missing>";
            return `redistribution.notPermitted: ${file} is included but redistribution conclusion is ${conclusion}`;
        })
        .sort();

/**
 * Evaluates a package file list against the full pack contract.
 *
 * @param {{
 *   files: Iterable<string>,
 *   manifest: object,
 *   publishableIcons: { file: string }[],
 * }} options
 * @returns {{
 *   ok: boolean,
 *   findings: {
 *     missingFiles: string[],
 *     blockedFiles: string[],
 *     missingAssets: string[],
 *     unexpectedAssets: string[],
 *     redistribution: string[],
 *   },
 * }}
 */
export function evaluatePackContents({ files, manifest, publishableIcons }) {
    const fileSet = new Set(files);
    const requiredFiles = [
        ...REQUIRED_RUNTIME_FILES,
        ...deriveRequiredLicenseFiles(manifest),
    ];
    const svgSet = comparePublishedSvgSet({ files: fileSet, publishableIcons });

    const findings = {
        missingFiles: findMissingFiles(fileSet, requiredFiles),
        blockedFiles: findBlockedFiles(fileSet, BLOCKED_PATTERNS),
        missingAssets: svgSet.missingAssets,
        unexpectedAssets: svgSet.unexpectedAssets,
        redistribution: findIncludedAssetsWithoutPermittedRedistribution(manifest),
    };

    return {
        ok: Object.values(findings).every((group) => group.length === 0),
        findings,
    };
}

/**
 * CLI entry point.
 *
 * @param {{ argv?: string[], dependencies?: object }} options
 * @returns {Promise<number>}
 */
export async function main({
    argv = process.argv.slice(2),
    dependencies = defaultDependencies,
} = {}) {
    const { files } = await dependencies.readPackFiles(argv);
    const [publishableIcons, manifest] = await Promise.all([
        dependencies.readPublishableIcons(),
        dependencies.readManifest(),
    ]);
    const result = evaluatePackContents({ files, manifest, publishableIcons });

    printFindings(result.findings, dependencies.writeDiagnostic);

    if (!result.ok) {
        return 1;
    }

    dependencies.writeOutput(
        `✓ Pack check passed: ${files.size} files total, ${publishableIcons.length} publishable SVGs in dist.`,
    );

    return 0;
}

function parsePackEntries(input) {
    const packOutput = JSON.parse(input);
    return Array.isArray(packOutput) ? packOutput : [packOutput];
}

export const extractPackFiles = (packEntries) =>
    new Set(
        packEntries.flatMap((entry) => entry.files.map((file) => `package/${file.path}`)),
    );

function printFindings(findings, writeDiagnostic) {
    if (findings.missingFiles.length > 0) {
        writeDiagnostic(
            `Missing required files:\n${
                findings.missingFiles
                    .map((file) => `  - ${file}`)
                    .join("\n")
            }`,
        );
    }

    if (findings.blockedFiles.length > 0) {
        writeDiagnostic(
            `Blocked files present:\n${
                findings.blockedFiles
                    .map((file) => `  - ${file}`)
                    .join("\n")
            }`,
        );
    }

    for (const file of findings.missingAssets) {
        writeDiagnostic(`svgSet.missing: ${file} is expected but absent from the tarball`);
    }

    for (const file of findings.unexpectedAssets) {
        writeDiagnostic(`svgSet.unexpected: ${file} is packaged but is not publishable`);
    }

    for (const finding of findings.redistribution) {
        writeDiagnostic(finding);
    }
}

const readJsonFile = async (path) => JSON.parse(await readFile(path, "utf8"));

async function packPackage() {
    const executable = process.platform === "win32" ? "cmd.exe" : "npm";
    const args = process.platform === "win32"
        ? ["/d", "/c", "npm.cmd", "pack", "--dry-run", "--json"]
        : ["pack", "--dry-run", "--json"];

    const { stdout } = await execFileAsync(executable, args, {
        cwd: packageRoot,
    });

    return stdout;
}

function stdinToString() {
    return new Promise((resolve, reject) => {
        let data = "";
        stdin.setEncoding("utf8");
        stdin.on("data", (chunk) => {
            data += chunk;
        });
        stdin.on("end", () => resolve(data));
        stdin.on("error", reject);
    });
}

const isMainModule = process.argv[1] && resolve(process.argv[1]) === scriptPath;

if (isMainModule) {
    process.exitCode = await main();
}
