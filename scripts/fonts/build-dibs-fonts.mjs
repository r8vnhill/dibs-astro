import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourceBoundary = join(repositoryRoot, "scripts/fonts/iosevka");
const planPath = join(sourceBoundary, "private-build-plans.toml");
const upstreamPath = join(sourceBoundary, "upstream.json");
const publicFontsRoot = join(repositoryRoot, "public/fonts");
const cacheRoot = join(repositoryRoot, "tmp/fonts");
const sourceCachePath = join(cacheRoot, "iosevka-34.8.0.tar.gz");

const candidates = [
    {
        plan: "dibs-sans",
        family: "DIBS Sans",
        outputDirectory: "dibs-sans",
        states: [
            { weight: 400, style: "normal", token: "Regular" },
            { weight: 400, style: "italic", token: "Italic" },
            { weight: 500, style: "normal", token: "Medium" },
            { weight: 700, style: "normal", token: "Bold" },
        ],
    },
    {
        plan: "dibs-slab",
        family: "DIBS Slab",
        outputDirectory: "dibs-slab",
        states: [
            { weight: 500, style: "normal", token: "Medium" },
            { weight: 700, style: "normal", token: "Bold" },
        ],
    },
];

const commandName = process.platform === "win32" ? "npm.cmd" : "npm";

function digest(bytes) {
    return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function readJson(path) {
    return JSON.parse(await readFile(path, "utf8"));
}

async function verifyPlanRevision(upstream) {
    const plan = await readFile(planPath);
    const expected = `sha256:${createHash("sha256").update(plan).digest("hex")}`;

    if (upstream.buildPlanRevision !== expected) {
        throw new Error(`Build-plan digest mismatch: expected ${expected}, found ${upstream.buildPlanRevision}.`);
    }
}

async function ensureSourceArchive(upstream, suppliedArchive) {
    const archivePath = suppliedArchive ? resolve(suppliedArchive) : sourceCachePath;
    await mkdir(dirname(archivePath), { recursive: true });

    try {
        const bytes = await readFile(archivePath);
        if (digest(bytes) === `sha256:${upstream.sourceArchive.sha256}`) return archivePath;
    } catch {
        // The archive is downloaded below when it is not cached or has the wrong digest.
    }

    if (suppliedArchive) {
        throw new Error(`Source archive does not match ${upstream.sourceArchive.sha256}: ${archivePath}`);
    }

    console.log(`Downloading pinned Iosevka ${upstream.version} source archive...`);
    const response = await fetch(upstream.sourceArchive.url);
    if (!response.ok || !response.body) {
        throw new Error(`Could not download ${upstream.sourceArchive.url}: HTTP ${response.status}.`);
    }

    await pipeline(response.body, createWriteStream(archivePath));
    const downloaded = await readFile(archivePath);
    const actualDigest = digest(downloaded);
    const expectedDigest = `sha256:${upstream.sourceArchive.sha256}`;
    if (actualDigest !== expectedDigest) {
        throw new Error(`Downloaded source archive digest mismatch: expected ${expectedDigest}, found ${actualDigest}.`);
    }

    return archivePath;
}

function run(command, args, options = {}) {
    return new Promise((resolveProcess, reject) => {
        const child = spawn(command, args, {
            ...options,
            stdio: "inherit",
            shell: process.platform === "win32",
        });
        child.once("error", reject);
        child.once("exit", (code, signal) => {
            if (code === 0) return resolveProcess();
            reject(new Error(`${command} ${args.join(" ")} failed (${signal ?? `exit ${code}`}).`));
        });
    });
}

async function extractSource(archivePath) {
    const extractionRoot = await mkdtemp(join(tmpdir(), "dibs-iosevka-"));
    await run("tar", ["-xzf", archivePath, "-C", extractionRoot]);
    const sourceRoot = join(extractionRoot, "Iosevka-34.8.0");
    await stat(sourceRoot);
    return { extractionRoot, sourceRoot };
}

async function buildFonts(sourceRoot) {
    await writeFile(join(sourceRoot, "private-build-plans.toml"), await readFile(planPath));
    await run(commandName, ["ci", "--ignore-scripts"], { cwd: sourceRoot });
    const jobs = process.env.DIBS_FONT_JOBS ?? "2";
    await run(
        commandName,
        ["run", "build", "--", `--jCmd=${jobs}`, "woff2-unhinted::dibs-sans", "woff2-unhinted::dibs-slab"],
        { cwd: sourceRoot },
    );
}

async function findGeneratedFont(sourceRoot, candidate, state) {
    const generatedDirectory = join(sourceRoot, "dist", candidate.plan, "WOFF2-Unhinted");
    const files = (await readdir(generatedDirectory)).filter((file) => file.endsWith(".woff2"));
    const match = files.find((file) => file.endsWith(`-${state.token}.woff2`));
    if (!match) {
        throw new Error(`Could not find ${candidate.family} ${state.weight} ${state.style} in ${generatedDirectory}.`);
    }
    return join(generatedDirectory, match);
}

async function stageAssets(sourceRoot, upstream) {
    await mkdir(cacheRoot, { recursive: true });
    const stagingRoot = await mkdtemp(join(cacheRoot, "generated-"));
    const assets = [];

    try {
        for (const candidate of candidates) {
            const candidateRoot = join(stagingRoot, candidate.outputDirectory);
            await mkdir(candidateRoot, { recursive: true });

            for (const state of candidate.states) {
                const sourcePath = await findGeneratedFont(sourceRoot, candidate, state);
                const fileName = `${state.weight}-${state.style}.woff2`;
                const targetPath = join(candidateRoot, fileName);
                const bytes = await readFile(sourcePath);
                await writeFile(targetPath, bytes);
                assets.push({
                    family: candidate.family,
                    format: "woff2",
                    path: `fonts/${candidate.outputDirectory}/${fileName}`,
                    sha256: digest(bytes),
                    style: state.style,
                    weight: state.weight,
                    bytes: bytes.byteLength,
                });
            }
        }

        const license = await readFile(join(sourceRoot, "LICENSE.md"));
        await writeFile(join(stagingRoot, "LICENSE.txt"), license);
        const licenseDigest = digest(license);
        const plan = await readFile(planPath);

        const manifest = {
            schemaVersion: 1,
            license: {
                name: "SIL Open Font License 1.1",
                path: "fonts/LICENSE.txt",
                sha256: licenseDigest,
                source: upstream.licenseUrl,
            },
            upstream: {
                project: upstream.project,
                version: upstream.version,
                tag: upstream.tag,
                commit: upstream.commit,
                sourceArchiveSha256: `sha256:${upstream.sourceArchive.sha256}`,
                buildPlanSha256: `sha256:${createHash("sha256").update(plan).digest("hex")}`,
                license: upstream.license,
            },
            generation: {
                command: "pnpm fonts:generate",
                target: "woff2-unhinted",
                source: "Iosevka custom build from the pinned source archive",
            },
            assets,
        };

        await writeFile(join(stagingRoot, "provenance.json"), `${JSON.stringify(manifest, null, 4)}\n`);
        return { stagingRoot, manifest };
    } catch (error) {
        await rm(stagingRoot, { recursive: true, force: true });
        throw error;
    }
}

async function publish(stagingRoot) {
    await mkdir(publicFontsRoot, { recursive: true });
    for (const candidate of candidates) {
        const target = join(publicFontsRoot, candidate.outputDirectory);
        await rm(target, { recursive: true, force: true });
        await rename(join(stagingRoot, candidate.outputDirectory), target);
    }
    await rename(join(stagingRoot, "LICENSE.txt"), join(publicFontsRoot, "LICENSE.txt"));
    await rename(join(stagingRoot, "provenance.json"), join(publicFontsRoot, "provenance.json"));
    await rm(stagingRoot, { recursive: true, force: true });
}

function manifestAssetPath(asset) {
    return join(repositoryRoot, "public", asset.path);
}

async function checkManifest() {
    const upstream = await readJson(upstreamPath);
    await verifyPlanRevision(upstream);
    const manifest = await readJson(join(publicFontsRoot, "provenance.json"));

    if (manifest.schemaVersion !== 1 || manifest.generation?.target !== "woff2-unhinted") {
        throw new Error("Font provenance manifest has an unsupported schema or generation target.");
    }
    if (
        manifest.upstream?.project !== upstream.project ||
        manifest.upstream?.version !== upstream.version ||
        manifest.upstream?.tag !== upstream.tag ||
        manifest.upstream?.commit !== upstream.commit ||
        manifest.upstream?.sourceArchiveSha256 !== `sha256:${upstream.sourceArchive.sha256}` ||
        manifest.upstream?.buildPlanSha256 !== upstream.buildPlanRevision
    ) {
        throw new Error("Font provenance manifest does not match the committed upstream pin.");
    }

    const expectedAssets = candidates.flatMap((candidate) =>
        candidate.states.map((state) => `${candidate.outputDirectory}/${state.weight}-${state.style}.woff2`),
    );
    const expectedMetadata = new Map(
        candidates.flatMap((candidate) =>
            candidate.states.map((state) => [
                `fonts/${candidate.outputDirectory}/${state.weight}-${state.style}.woff2`,
                { family: candidate.family, style: state.style, weight: state.weight },
            ]),
        ),
    );
    const actualAssets = manifest.assets.map((asset) => asset.path.replace("fonts/", ""));
    if (actualAssets.slice().sort().join("\n") !== expectedAssets.slice().sort().join("\n")) {
        throw new Error("Font provenance manifest does not contain exactly the required production assets.");
    }

    for (const asset of manifest.assets) {
        const bytes = await readFile(manifestAssetPath(asset));
        const expected = expectedMetadata.get(asset.path);
        if (
            !expected ||
            asset.family !== expected.family ||
            asset.style !== expected.style ||
            asset.weight !== expected.weight ||
            asset.sha256 !== digest(bytes) ||
            asset.bytes !== bytes.byteLength
        ) {
            throw new Error(`Font asset provenance mismatch: ${asset.path}`);
        }
    }

    const license = await readFile(join(publicFontsRoot, "LICENSE.txt"));
    if (manifest.license?.sha256 !== digest(license)) {
        throw new Error("Font license provenance mismatch.");
    }
    console.log(`Font provenance check passed for ${manifest.assets.length} WOFF2 assets.`);
}

async function generate(sourceArchive) {
    const upstream = await readJson(upstreamPath);
    await verifyPlanRevision(upstream);
    const archivePath = await ensureSourceArchive(upstream, sourceArchive);
    const { extractionRoot, sourceRoot } = await extractSource(archivePath);

    try {
        await buildFonts(sourceRoot);
        const { stagingRoot } = await stageAssets(sourceRoot, upstream);
        await publish(stagingRoot);
        await checkManifest();
        console.log("Generated and published DIBS Sans and DIBS Slab WOFF2 assets.");
    } finally {
        await rm(extractionRoot, { recursive: true, force: true });
    }
}

function parseArguments() {
    const args = process.argv.slice(2);
    if (args.includes("--check")) return { check: true };
    const archiveIndex = args.indexOf("--source-archive");
    return {
        check: false,
        sourceArchive: archiveIndex === -1 ? undefined : args[archiveIndex + 1],
    };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const arguments_ = parseArguments();
    (arguments_.check ? checkManifest() : generate(arguments_.sourceArchive)).catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    });
}

export { checkManifest };
