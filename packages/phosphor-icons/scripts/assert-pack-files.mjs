import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { unlink } from "node:fs/promises";
import { stdin } from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

// Required files that MUST be present in the tarball
const requiredFiles = new Set([
    "package/README.md",
    "package/package.json",
    "package/dist/index.js",
    "package/dist/index.d.ts",
    "package/dist/index.js.map",
]);

// Patterns for files that must NOT be present
const blockedPatterns = [
    /^package\/AGENTS\.md$/u,
    /^package\/src\//u,
    /^package\/scripts\//u,
    /^package\/tsup\.config\.ts$/u,
    /^package\/tsconfig\.json$/u,
];

const input = process.argv.includes("--pack")
    ? await packPackage()
    : await stdinToString();

const packOutput = JSON.parse(input);
const packEntries = Array.isArray(packOutput) ? packOutput : [packOutput];
const files = new Set(
    packEntries.flatMap((entry) =>
        entry.files.map((file) => `package/${file.path}`),
    ),
);

// Check 1: All required files present
const missingFiles = [...requiredFiles].filter((f) => !files.has(f));

// Check 2: No blocked files present
const blockedFiles = [...files].filter((f) =>
    blockedPatterns.some((p) => p.test(f)),
);

// Check 3: SVG count parity — count src SVGs and dist SVGs
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = resolve(packageRoot, "src");
const srcSvgFiles = (await readdir(srcDir)).filter((f) => f.endsWith(".svg"));
const srcSvgCount = srcSvgFiles.length;

// Count SVGs in the tarball dist
const distSvgCount = [...files].filter((f) =>
    /^package\/dist\/.+\.svg$/u.test(f),
).length;

const svgCountMismatch = srcSvgCount > 0 && srcSvgCount !== distSvgCount;

// Report results
const hasIssues =
    missingFiles.length > 0 || blockedFiles.length > 0 || svgCountMismatch;

if (missingFiles.length > 0) {
    console.error(
        `Missing required files:\n${missingFiles.map((f) => `  - ${f}`).join("\n")}`,
    );
}

if (blockedFiles.length > 0) {
    console.error(
        `Blocked files present:\n${blockedFiles.map((f) => `  - ${f}`).join("\n")}`,
    );
}

if (svgCountMismatch) {
    console.error(
        `SVG count mismatch: src has ${srcSvgCount}, dist in tarball has ${distSvgCount}`,
    );
}

if (hasIssues) {
    process.exit(1);
}

console.log(
    `✓ Pack check passed: ${files.size} files total, ${distSvgCount} SVGs in dist.`,
);

await removePackedTarballs(packEntries);

// ============= Helper functions =============

async function packPackage() {
    const executable = process.platform === "win32" ? "cmd.exe" : "npm";
    const args =
        process.platform === "win32"
            ? ["/d", "/c", "npm.cmd", "pack", "--json"]
            : ["pack", "--json"];

    const { stdout } = await execFileAsync(executable, args, {
        cwd: packageRoot,
    });

    return stdout;
}

async function removePackedTarballs(entries) {
    await Promise.all(
        entries.map(async (entry) => {
            if (
                typeof entry.filename !== "string" ||
                entry.filename.length === 0
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
