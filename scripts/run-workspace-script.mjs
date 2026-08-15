import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const [workspaceDirectory, scriptName] = process.argv.slice(2);

if (!workspaceDirectory || !scriptName) {
    throw new Error("Usage: node scripts/run-workspace-script.mjs <workspace-directory> <script-name>");
}

const workspacePath = path.resolve(workspaceDirectory);
const manifestPath = path.join(workspacePath, "package.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const command = manifest.scripts?.[scriptName];

if (typeof command !== "string") {
    throw new Error(`Workspace script ${scriptName} is not defined in ${workspaceDirectory}.`);
}

const rootBinDirectory = path.resolve("node_modules/.bin");
const result = await new Promise((resolve, reject) => {
    const child = spawn(command, {
        cwd: workspacePath,
        env: {
            ...process.env,
            PATH: `${rootBinDirectory}${path.delimiter}${process.env.PATH ?? ""}`,
            NODE_OPTIONS: process.env.NODE_OPTIONS,
        },
        shell: true,
        stdio: "inherit",
    });

    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
});

if (result.code !== 0) {
    throw new Error(`Workspace script ${scriptName} failed with ${result.signal ?? `exit code ${result.code}`}.`);
}
