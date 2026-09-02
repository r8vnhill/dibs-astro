import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const sourceBoundary = join(repositoryRoot, "scripts/fonts/reference/inter");
const upstreamPath = join(sourceBoundary, "upstream.json");
const referenceRoot = join(repositoryRoot, "public/dev-fixtures/fonts/inter-4.1");
const archiveCachePath = join(repositoryRoot, "tmp/fonts/inter-4.1.zip");
const manifestPath = join(referenceRoot, "provenance.json");
const licensePath = join(referenceRoot, "LICENSE.txt");
const family = "Inter Reference 4.1";

function digest(bytes) {
    return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function readJson(path) {
    return JSON.parse(await readFile(path, "utf8"));
}

async function downloadArchive(upstream) {
    await mkdir(dirname(archiveCachePath), { recursive: true });

    try {
        const cached = await readFile(archiveCachePath);
        if (digest(cached) === upstream.archive.sha256) return archiveCachePath;
    } catch {
        // Download below when the cache is absent or stale.
    }

    const response = await fetch(upstream.archive.url);
    if (!response.ok || !response.body) {
        throw new Error(`Could not download ${upstream.archive.url}: HTTP ${response.status}.`);
    }

    await pipeline(response.body, createWriteStream(archiveCachePath));
    const downloaded = await readFile(archiveCachePath);
    if (digest(downloaded) !== upstream.archive.sha256) {
        throw new Error(
            `Inter archive digest mismatch: expected ${upstream.archive.sha256}, found ${digest(downloaded)}.`,
        );
    }

    return archiveCachePath;
}

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

async function extractArchive(archivePath) {
    const extractionRoot = await mkdtemp(join(tmpdir(), "dibs-inter-"));

    if (process.platform === "win32") {
        await run("powershell.exe", [
            "-NoProfile",
            "-Command",
            `Expand-Archive -LiteralPath '${archivePath.replaceAll("'", "''")}' -DestinationPath '${
                extractionRoot.replaceAll("'", "''")
            }' -Force`,
        ]);
    } else {
        await run("unzip", ["-q", archivePath, "-d", extractionRoot]);
    }

    return { extractionRoot, sourceRoot: extractionRoot };
}

async function findSourceRoot(extractionRoot) {
    const entries = await readdir(extractionRoot, { withFileTypes: true });
    if (entries.some((entry) => entry.isDirectory() && entry.name === "web")) return extractionRoot;
    const rootDirectory = entries.find((entry) => entry.isDirectory());
    if (!rootDirectory) throw new Error(`Could not find the extracted Inter release directory in ${extractionRoot}.`);
    return join(extractionRoot, rootDirectory.name);
}

async function buildManifest(upstream, assets, license) {
    return {
        schemaVersion: 1,
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
            path: "fonts/inter-4.1/LICENSE.txt",
            sha256: digest(license),
            source: upstream.license.url,
        },
        assets,
    };
}

async function publish(upstream, sourceRoot) {
    const stagingRoot = await mkdtemp(join(repositoryRoot, "tmp/fonts/inter-reference-"));

    try {
        const assets = [];
        for (const asset of upstream.assets) {
            const sourcePath = join(sourceRoot, asset.source);
            const targetPath = join(stagingRoot, asset.target);
            const bytes = await readFile(sourcePath);
            if (digest(bytes) !== asset.sha256 || bytes.byteLength !== asset.bytes) {
                throw new Error(`Source asset provenance mismatch: ${asset.source}`);
            }
            await copyFile(sourcePath, targetPath);
            assets.push({
                family,
                format: "woff2",
                path: `dev-fixtures/fonts/inter-4.1/${asset.target}`,
                source: asset.source,
                sha256: asset.sha256,
                bytes: asset.bytes,
                style: asset.style,
                weight: asset.weight,
            });
        }

        await copyFile(join(sourceRoot, "LICENSE.txt"), join(stagingRoot, "LICENSE.txt"));
        const license = await readFile(join(stagingRoot, "LICENSE.txt"));
        if (digest(license) !== upstream.license.sha256) throw new Error("Inter license digest mismatch.");

        const manifest = await buildManifest(upstream, assets, license);
        await writeFile(join(stagingRoot, "provenance.json"), `${JSON.stringify(manifest, null, 4)}\n`);
        await mkdir(referenceRoot, { recursive: true });
        for (const asset of upstream.assets) {
            await copyFile(join(stagingRoot, asset.target), join(referenceRoot, asset.target));
        }
        await copyFile(join(stagingRoot, "LICENSE.txt"), licensePath);
        await copyFile(join(stagingRoot, "provenance.json"), manifestPath);
    } finally {
        await rm(stagingRoot, { recursive: true, force: true });
    }
}

async function check() {
    const upstream = await readJson(upstreamPath);
    const manifest = await readJson(manifestPath);
    if (manifest.schemaVersion !== 1 || manifest.family !== family || manifest.evaluationOnly !== true) {
        throw new Error("Inter reference manifest has an unsupported schema or identity.");
    }
    if (manifest.upstream.archive.sha256 !== upstream.archive.sha256 || manifest.upstream.tag !== upstream.tag) {
        throw new Error("Inter reference manifest does not match the pinned upstream release.");
    }
    if (
        digest(await readFile(licensePath)) !== upstream.license.sha256
        || manifest.license.sha256 !== upstream.license.sha256
    ) {
        throw new Error("Inter reference license provenance mismatch.");
    }

    const expected = new Map(upstream.assets.map((asset) => [asset.target, asset]));
    const actual = (await readdir(referenceRoot)).filter((file) => file.endsWith(".woff2"));
    if (actual.sort().join("\n") !== [...expected.keys()].sort().join("\n")) {
        throw new Error("Inter reference contains an unexpected WOFF2 set.");
    }

    for (const [target, asset] of expected) {
        const path = join(referenceRoot, target);
        const bytes = await readFile(path);
        const manifestAsset = manifest.assets.find((candidate) => candidate.path.endsWith(`/${target}`));
        if (
            !manifestAsset
            || manifestAsset.source !== asset.source
            || manifestAsset.weight !== asset.weight
            || manifestAsset.style !== asset.style
            || manifestAsset.sha256 !== asset.sha256
            || manifestAsset.bytes !== asset.bytes
            || digest(bytes) !== asset.sha256
            || bytes.byteLength !== asset.bytes
        ) {
            throw new Error(`Inter reference asset provenance mismatch: ${target}`);
        }
    }
    console.log(`Inter reference check passed for ${expected.size} WOFF2 assets.`);
}

async function vendor() {
    const upstream = await readJson(upstreamPath);
    const archivePath = await downloadArchive(upstream);
    const { extractionRoot } = await extractArchive(archivePath);

    try {
        await publish(upstream, await findSourceRoot(extractionRoot));
    } finally {
        await rm(extractionRoot, { recursive: true, force: true });
    }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    (process.argv.includes("--check") ? check() : vendor()).catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    });
}

export { check };
