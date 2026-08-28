import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, lstat, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const candidatePath = path.resolve(process.env.ASTRO_HEAD_CANDIDATE ?? "");
const expectedSha256 = process.env.ASTRO_HEAD_CANDIDATE_SHA256?.toLowerCase();
const keepWorkdir = process.argv.includes("--keep-workdir");

if (!process.env.ASTRO_HEAD_CANDIDATE || !expectedSha256) {
    throw new Error(
        "Set ASTRO_HEAD_CANDIDATE to the packed archive and ASTRO_HEAD_CANDIDATE_SHA256 to its expected digest.",
    );
}

async function sha256Of(filePath) {
    const hash = createHash("sha256");
    const file = await readFile(filePath);
    hash.update(file);
    return hash.digest("hex");
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

const actualSha256 = await sha256Of(candidatePath);
if (actualSha256 !== expectedSha256) {
    throw new Error(`Candidate digest mismatch: expected ${expectedSha256}, got ${actualSha256}.`);
}

const workDir = await mkdtemp(path.join(tmpdir(), "dibs-astro-head-"));
try {
    await cp(root, workDir, { recursive: true, filter: isDisposablePath });
    const packageJsonPath = path.join(workDir, "package.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
    packageJson.dependencies["@ravenhill/astro-head"] = candidatePath;
    await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 4)}\n`);
    const userConfig = path.join(workDir, ".qualification.npmrc");
    await writeFile(userConfig, "\n");
    await run("pnpm", ["install", "--no-frozen-lockfile", `--config.userconfig=${userConfig}`], workDir);
    const installedDir = path.join(workDir, "node_modules", "@ravenhill", "astro-head");
    if ((await lstat(installedDir)).isSymbolicLink()) {
        throw new Error("DIBS installed astro-head as a symlink; qualification must use the packed candidate.");
    }
    const installedPackage = JSON.parse(await readFile(path.join(installedDir, "package.json"), "utf8"));
    if (installedPackage.name !== "@ravenhill/astro-head" || installedPackage.version !== "0.1.0") {
        throw new Error(`Unexpected installed package identity: ${installedPackage.name}@${installedPackage.version}`);
    }

    await run("pnpm", ["run", "build:content-core"], workDir);
    await run("pnpm", ["run", "build:lesson-export-core"], workDir);
    await run("pnpm", ["run", "build:shiki-core"], workDir);
    await run("pnpm", ["exec", "vitest", "run", "--config", "vitest.config.ts", "src/utils/__tests__"], workDir);
    await run(
        "pnpm",
        ["exec", "vitest", "run", "--config", "vitest.astro.config.ts", "src/components/meta/__tests__"],
        workDir,
    );
    await run("pnpm", ["exec", "astro", "check"], workDir);
    await run("pnpm", ["run", "build"], workDir);

    console.log(`DIBS qualified @ravenhill/astro-head@0.1.0 from ${actualSha256}.`);
} finally {
    if (keepWorkdir) console.log(`Kept qualification worktree at ${workDir}`);
    else await rm(workDir, { recursive: true, force: true });
}
