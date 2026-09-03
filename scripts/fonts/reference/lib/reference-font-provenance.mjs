/**
 * @fileoverview Shared engine for vendoring evaluation-only reference fonts with full provenance.
 *
 * Each DIBS typography experiment compares an in-house candidate family against a pinned upstream
 * release that is rendered from committed local WOFF2 files, never a web-font service. Every
 * `scripts/fonts/reference/<family>/build-*.mjs` entry point is a thin config wrapper around the two
 * commands this module builds:
 *
 * - `vendor`: download the pinned release archive, verify its SHA-256, extract it, copy only the
 *   declared assets (re-checking every byte count and hash), and write `provenance.json`.
 * - `check`: run fully offline. Re-hash the committed reference files and license and confirm they
 *   still match both `upstream.json` and the generated `provenance.json`.
 *
 * For course readers: this is what lets the typography lessons claim "zero cost, no tracking". Every
 * reference byte is pinned by hash, committed to the repository, and re-verifiable without network
 * access.
 *
 * `upstream.json` shape, per family:
 *
 *     project, version, tag, repository, releaseUrl
 *     archive: { name, url, sha256 }
 *     license: { name, url, sourcePath, sha256 }
 *     assets:  [ { source, target, weight, style, sha256, bytes } ]
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const MANIFEST_SCHEMA_VERSION = 1;

/** SHA-256 of a byte buffer, formatted like the digests stored in `upstream.json`. */
export function digest(bytes) {
    return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

/** Read and parse a UTF-8 JSON file. */
export async function readJson(path) {
    return JSON.parse(await readFile(path, "utf8"));
}

/** Run a child process, inheriting stdio, and reject on any non-zero exit. */
function run(command, args, options = {}) {
    return new Promise((resolveProcess, reject) => {
        const child = spawn(command, args, { ...options, stdio: "inherit", shell: process.platform === "win32" });
        child.once("error", reject);
        child.once("exit", (code, signal) => {
            if (code === 0) return resolveProcess();
            reject(new Error(`${command} ${args.join(" ")} failed (${signal ?? `exit ${code}`}).`));
        });
    });
}

/**
 * Return the local archive path, downloading it first unless a byte-identical copy is already cached.
 * A cached file whose digest no longer matches `upstream.archive.sha256` is re-downloaded.
 */
export async function downloadArchive(upstream, archiveCachePath) {
    await mkdir(dirname(archiveCachePath), { recursive: true });

    try {
        const cached = await readFile(archiveCachePath);
        if (digest(cached) === upstream.archive.sha256) return archiveCachePath;
    } catch {
        // Fall through and download when the cache is absent or unreadable.
    }

    const response = await fetch(upstream.archive.url);
    if (!response.ok || !response.body) {
        throw new Error(`Could not download ${upstream.archive.url}: HTTP ${response.status}.`);
    }

    await pipeline(response.body, createWriteStream(archiveCachePath));
    const downloaded = await readFile(archiveCachePath);
    if (digest(downloaded) !== upstream.archive.sha256) {
        throw new Error(`Archive digest mismatch: expected ${upstream.archive.sha256}, found ${digest(downloaded)}.`);
    }

    return archiveCachePath;
}

/** Extract a ZIP archive into a fresh temp directory and return that directory. */
export async function extractArchive(archivePath, tmpPrefix) {
    const extractionRoot = await mkdtemp(join(tmpdir(), tmpPrefix));

    if (process.platform === "win32") {
        const quotedArchive = archivePath.replaceAll("'", "''");
        const quotedTarget = extractionRoot.replaceAll("'", "''");
        const expand = `Expand-Archive -LiteralPath '${quotedArchive}' -DestinationPath '${quotedTarget}' -Force`;
        await run("powershell.exe", ["-NoProfile", "-Command", expand]);
    } else {
        await run("unzip", ["-q", archivePath, "-d", extractionRoot]);
    }

    return extractionRoot;
}

/**
 * Find the release root inside an extracted archive. Some releases (Inter) unpack their assets under a
 * `web/` directory at the top level; most nest everything under a single versioned directory.
 */
export async function findSourceRoot(extractionRoot) {
    const entries = await readdir(extractionRoot, { withFileTypes: true });
    if (entries.some((entry) => entry.isDirectory() && entry.name === "web")) return extractionRoot;
    const rootDirectory = entries.find((entry) => entry.isDirectory());
    if (!rootDirectory) throw new Error(`Could not find the extracted release directory in ${extractionRoot}.`);
    return join(extractionRoot, rootDirectory.name);
}

/** Copy each declared asset into staging after re-verifying its hash and byte count; return metadata. */
async function stageAssets({ upstream, sourceRoot, stagingRoot, family, referencePath }) {
    const assets = [];
    for (const asset of upstream.assets) {
        const bytes = await readFile(join(sourceRoot, asset.source));
        if (digest(bytes) !== asset.sha256 || bytes.byteLength !== asset.bytes) {
            throw new Error(`Source asset provenance mismatch: ${asset.source}`);
        }
        await copyFile(join(sourceRoot, asset.source), join(stagingRoot, asset.target));
        assets.push({
            family,
            format: "woff2",
            path: `${referencePath}/${asset.target}`,
            source: asset.source,
            sha256: asset.sha256,
            bytes: asset.bytes,
            style: asset.style,
            weight: asset.weight,
        });
    }
    return assets;
}

/** Copy the upstream license into staging as `LICENSE.txt` and verify its digest; return its bytes. */
async function stageLicense({ upstream, sourceRoot, stagingRoot, family }) {
    await copyFile(join(sourceRoot, upstream.license.sourcePath), join(stagingRoot, "LICENSE.txt"));
    const bytes = await readFile(join(stagingRoot, "LICENSE.txt"));
    if (digest(bytes) !== upstream.license.sha256) throw new Error(`${family} license digest mismatch.`);
    return bytes;
}

/** Build the `provenance.json` object that mirrors the vendored reference for the browser fixture. */
function composeManifest({ upstream, family, referencePath, licenseBytes, assets }) {
    return {
        schemaVersion: MANIFEST_SCHEMA_VERSION,
        family,
        evaluationOnly: true,
        upstream: {
            project: upstream.project,
            version: upstream.version,
            tag: upstream.tag,
            repository: upstream.repository,
            releaseUrl: upstream.releaseUrl,
            archive: upstream.archive,
            license: upstream.license,
        },
        license: {
            name: upstream.license.name,
            path: `${referencePath}/LICENSE.txt`,
            sha256: digest(licenseBytes),
            source: upstream.license.url,
        },
        assets,
    };
}

/** Copy the staged assets, license, and manifest into the committed reference directory. */
async function commitStagedReference({ upstream, stagingRoot, referenceRoot, licensePath, manifest }) {
    await mkdir(referenceRoot, { recursive: true });
    for (const asset of upstream.assets) {
        await copyFile(join(stagingRoot, asset.target), join(referenceRoot, asset.target));
    }
    await copyFile(join(stagingRoot, "LICENSE.txt"), licensePath);
    await writeFile(join(referenceRoot, "provenance.json"), `${JSON.stringify(manifest, null, 4)}\n`);
}

/**
 * Stage the declared assets and license from an extracted release, verify every byte, then publish
 * them plus a fresh `provenance.json` into the committed reference directory.
 */
export async function publishReference({ upstream, sourceRoot, family, referenceRoot, referencePath, licensePath }) {
    const stagingPrefix = `${upstream.project.toLowerCase().replaceAll(" ", "-")}-reference-`;
    const stagingRoot = await mkdtemp(join(dirname(referenceRoot), stagingPrefix));

    try {
        const assets = await stageAssets({ upstream, sourceRoot, stagingRoot, family, referencePath });
        const licenseBytes = await stageLicense({ upstream, sourceRoot, stagingRoot, family });
        const manifest = composeManifest({ upstream, family, referencePath, licenseBytes, assets });
        await commitStagedReference({ upstream, stagingRoot, referenceRoot, licensePath, manifest });
    } finally {
        await rm(stagingRoot, { recursive: true, force: true });
    }
}

/** Confirm the manifest's schema version and family identity are the ones this build produces. */
function assertManifestIdentity(manifest, family) {
    const identityMatches = manifest.schemaVersion === MANIFEST_SCHEMA_VERSION
        && manifest.family === family
        && manifest.evaluationOnly === true;
    if (!identityMatches) throw new Error(`${family} reference manifest has an unsupported schema or identity.`);
}

/** Confirm the manifest still describes the exact upstream release pinned in `upstream.json`. */
function assertUpstreamPinned(manifest, upstream, family) {
    const pinnedFields = ["project", "version", "tag", "repository", "releaseUrl"];
    const upstreamMatches = pinnedFields.every((field) => manifest.upstream[field] === upstream[field])
        && manifest.upstream.archive.sha256 === upstream.archive.sha256;
    if (!upstreamMatches) throw new Error(`${family} reference manifest does not match the pinned upstream release.`);
}

/** Confirm the committed license file and the manifest still carry the pinned license digest. */
async function assertLicenseProvenance({ manifest, upstream, licensePath, family }) {
    const licenseMatches = digest(await readFile(licensePath)) === upstream.license.sha256
        && manifest.license.sha256 === upstream.license.sha256
        && manifest.license.path.endsWith("/LICENSE.txt");
    if (!licenseMatches) throw new Error(`${family} reference license provenance mismatch.`);
}

/** Confirm the reference directory holds exactly the declared WOFF2 set, each matching its pin. */
async function assertReferenceAssets({ manifest, upstream, referenceRoot, family }) {
    const expected = new Map(upstream.assets.map((asset) => [asset.target, asset]));
    const actual = (await readdir(referenceRoot)).filter((file) => file.endsWith(".woff2"));
    if (actual.sort().join("\n") !== [...expected.keys()].sort().join("\n")) {
        throw new Error(`${family} reference contains an unexpected WOFF2 set.`);
    }
    if (manifest.assets.length !== expected.size) {
        throw new Error(`${family} reference manifest contains an unexpected asset entry.`);
    }

    for (const [target, asset] of expected) {
        const bytes = await readFile(join(referenceRoot, target));
        const metadata = manifest.assets.find((candidate) => candidate.path.endsWith(`/${target}`));
        const assetMatches = metadata
            && metadata.family === family
            && metadata.source === asset.source
            && metadata.weight === asset.weight
            && metadata.style === asset.style
            && metadata.sha256 === asset.sha256
            && metadata.bytes === asset.bytes
            && digest(bytes) === asset.sha256
            && bytes.byteLength === asset.bytes;
        if (!assetMatches) throw new Error(`${family} reference asset provenance mismatch: ${target}`);
    }
    return expected.size;
}

/**
 * Offline verification that the committed reference still matches `upstream.json` and its own
 * `provenance.json` down to every byte. Throws on the first mismatch; logs a summary on success.
 */
export async function checkReference({ upstreamPath, referenceRoot, manifestPath, licensePath, family }) {
    const upstream = await readJson(upstreamPath);
    const manifest = await readJson(manifestPath);

    assertManifestIdentity(manifest, family);
    assertUpstreamPinned(manifest, upstream, family);
    await assertLicenseProvenance({ manifest, upstream, licensePath, family });
    const assetCount = await assertReferenceAssets({ manifest, upstream, referenceRoot, family });

    console.log(`${family} reference check passed for ${assetCount} WOFF2 assets.`);
}

/**
 * Build the `check` and `vendor` commands for one reference family from its pins. Every path is
 * derived from the repository root so build scripts stay declarative.
 *
 * @param {object} config
 * @param {string} config.importMetaUrl - `import.meta.url` of the calling build script (locates the repo root).
 * @param {string} config.dirName - Folder name under `scripts/fonts/reference/` holding `upstream.json`.
 * @param {string} config.referenceDirName - Folder name under `public/dev-fixtures/fonts/` for committed assets.
 * @param {string} config.archiveName - File name for the cached release archive under `tmp/fonts/`.
 * @param {string} config.family - Human-readable reference family name recorded in `provenance.json`.
 * @param {string} config.tmpPrefix - Prefix for the extraction temp directory.
 */
export function defineReferenceFont({ importMetaUrl, dirName, referenceDirName, archiveName, family, tmpPrefix }) {
    const repositoryRoot = resolve(dirname(fileURLToPath(importMetaUrl)), "../../../..");
    const upstreamPath = join(repositoryRoot, "scripts/fonts/reference", dirName, "upstream.json");
    const referenceRoot = join(repositoryRoot, "public/dev-fixtures/fonts", referenceDirName);
    const referencePath = `dev-fixtures/fonts/${referenceDirName}`;
    const manifestPath = join(referenceRoot, "provenance.json");
    const licensePath = join(referenceRoot, "LICENSE.txt");
    const archiveCachePath = join(repositoryRoot, "tmp/fonts", archiveName);

    const check = () => checkReference({ upstreamPath, referenceRoot, manifestPath, licensePath, family });

    const vendor = async () => {
        const upstream = await readJson(upstreamPath);
        const archivePath = await downloadArchive(upstream, archiveCachePath);
        const extractionRoot = await extractArchive(archivePath, tmpPrefix);
        try {
            const sourceRoot = await findSourceRoot(extractionRoot);
            await publishReference({ upstream, sourceRoot, family, referenceRoot, referencePath, licensePath });
        } finally {
            await rm(extractionRoot, { recursive: true, force: true });
        }
    };

    return { check, vendor };
}

/**
 * Run a build script as a CLI when it is the process entry point: `--check` runs `check`, otherwise
 * `vendor`. Any failure prints a single-line message and sets a non-zero exit code.
 */
export function runReferenceFontCli({ importMetaUrl, check, vendor }) {
    if (importMetaUrl !== pathToFileURL(process.argv[1]).href) return;
    (process.argv.includes("--check") ? check() : vendor()).catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    });
}
