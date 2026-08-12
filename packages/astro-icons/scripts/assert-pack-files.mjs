import { execFile } from "node:child_process";
import { readdir, readFile, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { stdin } from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

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

const defaultDependencies = Object.freeze({
    readManifest: () => readJsonFile(DEFAULT_MANIFEST_PATH),
    readPackFiles: (argv) =>
        (argv.includes("--pack") ? packPackage() : stdinToString()).then(
            (input) => {
                const packEntries = parsePackEntries(input);
                return {
                    entries: packEntries,
                    files: extractPackFiles(packEntries),
                };
            },
        ),
    countSourceSvgs: () => countSourceSvgs(),
    writeDiagnostic: (message) => console.error(message),
    writeOutput: (message) => console.log(message),
    removePackedTarballs: (entries) => removePackedTarballs(entries),
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
        if (asset?.releaseDecision?.action !== "include") {
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
 * Checks that source SVG count and packaged dist SVG count match.
 *
 * @param {Iterable<string>} files
 * @param {number} srcSvgCount
 * @returns {string[]}
 */
export function checkSvgParity(files, srcSvgCount) {
    const distSvgCount = [...files].filter((file) => /^package\/dist\/.+\.svg$/u.test(file)).length;

    if (srcSvgCount === 0 || srcSvgCount === distSvgCount) {
        return [];
    }

    return [
        `svgParity.mismatch: src has ${srcSvgCount}, dist in tarball has ${distSvgCount}`,
    ];
}

/**
 * Finds manifest assets marked for inclusion without permitted redistribution.
 *
 * @param {object} manifest
 * @returns {string[]}
 */
export const findIncludedAssetsWithoutPermittedRedistribution = (manifest) =>
    getManifestAssets(manifest)
        .filter((asset) => asset?.releaseDecision?.action === "include")
        .filter((asset) => asset?.redistribution?.conclusion !== "permitted")
        .map((asset) => {
            const file = asset?.file ?? "<unknown>";
            const conclusion = asset?.redistribution?.conclusion ?? "<missing>";
            return `redistribution.notPermitted: ${file} is included but redistribution conclusion is ${conclusion}`;
        })
        .sort();

/**
 * Evaluates a package file list against the full pack contract.
 *
 * @param {{ files: Iterable<string>, manifest: object, srcSvgCount: number }} options
 * @returns {{ ok: boolean, findings: { missingFiles: string[], blockedFiles: string[], svgParity: string[], redistribution: string[] } }}
 */
export function evaluatePackContents({ files, manifest, srcSvgCount }) {
    const fileSet = new Set(files);
    const requiredFiles = [
        ...REQUIRED_RUNTIME_FILES,
        ...deriveRequiredLicenseFiles(manifest),
    ];

    const findings = {
        missingFiles: findMissingFiles(fileSet, requiredFiles),
        blockedFiles: findBlockedFiles(fileSet, BLOCKED_PATTERNS),
        svgParity: checkSvgParity(fileSet, srcSvgCount),
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
    const { entries, files } = await dependencies.readPackFiles(argv);
    const [srcSvgCount, manifest] = await Promise.all([
        dependencies.countSourceSvgs(),
        dependencies.readManifest(),
    ]);
    const result = evaluatePackContents({ files, manifest, srcSvgCount });

    printFindings(result.findings, dependencies.writeDiagnostic);

    if (!result.ok) {
        return 1;
    }

    const distSvgCount = [...files].filter((file) => /^package\/dist\/.+\.svg$/u.test(file)).length;
    dependencies.writeOutput(
        `✓ Pack check passed: ${files.size} files total, ${distSvgCount} SVGs in dist.`,
    );

    await dependencies.removePackedTarballs(entries);
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

    for (const finding of findings.svgParity) {
        writeDiagnostic(finding);
    }

    for (const finding of findings.redistribution) {
        writeDiagnostic(finding);
    }
}

const readJsonFile = async (path) => JSON.parse(await readFile(path, "utf8"));

async function countSourceSvgs() {
    const srcDir = resolve(packageRoot, "src");
    const srcSvgFiles = (await readdir(srcDir)).filter((file) => file.endsWith(".svg"));
    return srcSvgFiles.length;
}

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

async function removePackedTarballs(entries) {
    await Promise.all(
        entries.map(async (entry) => {
            if (
                typeof entry.filename !== "string"
                || entry.filename.length === 0
            ) {
                return;
            }

            await unlink(resolve(packageRoot, entry.filename)).catch(
                (error) => {
                    if (error?.code !== "ENOENT") {
                        throw error;
                    }
                },
            );
        }),
    );
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
