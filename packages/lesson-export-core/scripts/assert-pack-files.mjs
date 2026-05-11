import { execFile } from "node:child_process";
import { unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { stdin } from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const expectedFiles = new Set([
    "package/README.md",
    "package/dist/index.d.ts",
    "package/dist/index.js",
    "package/dist/index.js.map",
    "package/package.json",
]);

const blockedPatterns = [
    /^package\/AGENTS\.md$/u,
    /^package\/src\//u,
    /^package\/tests\//u,
    /^package\/tsup\.config\.ts$/u,
    /^package\/.*\.test\./u,
    /^package\/vitest\.config\./u,
];

const input = process.argv.includes("--pack")
    ? await packPackage()
    : await stdinToString();
const packOutput = JSON.parse(input);
const packEntries = Array.isArray(packOutput) ? packOutput : [packOutput];
const files = new Set(
    packEntries.flatMap((entry) => entry.files.map((file) => `package/${file.path}`)),
);

const missingFiles = [...expectedFiles].filter((file) => !files.has(file));
const extraFiles = [...files].filter((file) => !expectedFiles.has(file));
const blockedFiles = [...files].filter((file) => blockedPatterns.some((pattern) => pattern.test(file)));

if (missingFiles.length > 0 || extraFiles.length > 0 || blockedFiles.length > 0) {
    console.error(formatPackIssue("Missing expected package files", missingFiles));
    console.error(formatPackIssue("Unexpected package files", extraFiles));
    console.error(formatPackIssue("Blocked package files", blockedFiles));
    process.exit(1);
}

async function packPackage() {
    const executable = process.platform === "win32" ? "cmd.exe" : "npm";
    const args = process.platform === "win32"
        ? ["/d", "/c", "npm.cmd", "pack", "--json"]
        : ["pack", "--json"];
    const { stdout } = await execFileAsync(executable, args, {
        cwd: resolve(import.meta.dirname, ".."),
    });
    return stdout;
}

await removePackedTarballs(packEntries);

async function removePackedTarballs(entries) {
    await Promise.all(entries.map(async (entry) => {
        if (typeof entry.filename !== "string" || entry.filename.length === 0) {
            return;
        }

        await unlink(resolve(import.meta.dirname, "..", entry.filename)).catch((error) => {
            if (error?.code !== "ENOENT") {
                throw error;
            }
        });
    }));
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

function formatPackIssue(title, files) {
    return files.length > 0
        ? `${title}:\n${files.map((file) => `- ${file}`).join("\n")}`
        : `${title}: none`;
}
