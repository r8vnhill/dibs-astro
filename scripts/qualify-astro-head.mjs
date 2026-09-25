import { spawn } from "node:child_process";
import { cp, lstat, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    checkArchiveDigest,
    checkInstalledCandidateIdentity,
    loadCandidateManifest,
    sha256OfFile,
} from "./lib/astro-head-candidate.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifestPathInput = process.env.ASTRO_HEAD_CANDIDATE_MANIFEST;
const keepWorkdir = process.argv.includes("--keep-workdir");

if (!manifestPathInput) {
    throw new Error(
        "Set ASTRO_HEAD_CANDIDATE_MANIFEST to the astro-head release/package-manifest.json describing the candidate.",
    );
}

function run(command, args, cwd) {
    const usesPnpmEntry = command === "pnpm" && /\.(?:cjs|js)$/.test(process.env.npm_execpath ?? "");
    const executable = usesPnpmEntry
        ? process.execPath
        : process.platform === "win32" && command === "pnpm"
        ? "pnpm.cmd"
        : command;
    const commandArgs = usesPnpmEntry ? [process.env.npm_execpath, ...args] : args;
    return new Promise((resolve, reject) => {
        const child = spawn(executable, commandArgs, {
            cwd,
            env: process.env,
            shell: process.platform === "win32" && executable.endsWith(".cmd"),
            stdio: "inherit",
        });
        child.on("error", reject);
        child.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
        });
    });
}

function isDisposablePath(source) {
    const segments = source.split(path.sep);
    return !["node_modules", ".astro", "dist", ".git", ".pnpm-store", ".vercel", ".netlify"].some((name) =>
        segments.includes(name)
    );
}

function fail(reason) {
    throw new Error(reason);
}

const loaded = await loadCandidateManifest(manifestPathInput);
if (!loaded.valid) fail(loaded.reason);
const { manifestPath, candidate, archivePath } = loaded;

let archiveStat;
try {
    archiveStat = await stat(archivePath);
} catch {
    fail(`Candidate archive not found beside ${manifestPath}: ${archivePath}`);
}
if (!archiveStat.isFile()) {
    fail(`Candidate archive is not a file: ${archivePath}`);
}

const digestCheck = checkArchiveDigest({
    expected: candidate.sha256,
    actual: await sha256OfFile(archivePath),
    archivePath,
});
if (!digestCheck.valid) fail(digestCheck.reason);

const workDir = await mkdtemp(path.join(tmpdir(), "dibs-astro-head-"));
try {
    await cp(root, workDir, { recursive: true, filter: isDisposablePath });
    const packageJsonPath = path.join(workDir, "package.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
    packageJson.dependencies["@ravenhill/astro-head"] = archivePath;
    await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 4)}\n`);
    const userConfig = path.join(workDir, ".qualification.npmrc");
    await writeFile(userConfig, "\n");
    await run("pnpm", ["install", "--no-frozen-lockfile", `--config.userconfig=${userConfig}`], workDir);
    const installedDir = path.join(workDir, "node_modules", "@ravenhill", "astro-head");
    if ((await lstat(installedDir)).isSymbolicLink()) {
        throw new Error("DIBS installed astro-head as a symlink; qualification must use the packed candidate.");
    }
    const installedPackage = JSON.parse(await readFile(path.join(installedDir, "package.json"), "utf8"));
    const identityCheck = checkInstalledCandidateIdentity({ installed: installedPackage, candidate });
    if (!identityCheck.valid) fail(identityCheck.reason);

    await run("pnpm", ["run", "build:lesson-export-core"], workDir);
    await run("pnpm", ["run", "build:shiki-core"], workDir);
    await run("pnpm", ["exec", "vitest", "run", "--config", "vitest.config.ts", "src/utils/__tests__"], workDir);
    await run(
        "pnpm",
        [
            "exec",
            "vitest",
            "run",
            "--config",
            "vitest.config.ts",
            "src/components/meta/__tests__/dibs-head-links.test.ts",
        ],
        workDir,
    );
    await run(
        "pnpm",
        ["exec", "vitest", "run", "--config", "vitest.astro.config.ts", "src/components/meta/__tests__"],
        workDir,
    );
    await run("pnpm", ["exec", "astro", "check"], workDir);
    await run("pnpm", ["run", "build"], workDir);

    console.log(`DIBS qualified ${candidate.package}@${candidate.version} from ${candidate.sha256}.`);
} finally {
    if (keepWorkdir) console.log(`Kept qualification worktree at ${workDir}`);
    else await rm(workDir, { recursive: true, force: true });
}
