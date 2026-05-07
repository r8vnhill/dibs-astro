import { stdin } from "node:process";

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
    /^package\/__tests__\//u,
    /^package\/tsup\.config\.ts$/u,
    /^package\/.*\.test\./u,
    /^package\/vitest\.config\./u,
];

const input = await stdinToString();
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
