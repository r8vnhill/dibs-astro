import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { evaluatePackContents, extractPackFiles } from "../assert-pack-files.mjs";
import { resolvePublishableIcons } from "../lib/publishable-plan.mjs";

const execFileAsync = promisify(execFile);
const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
const manifestPath = fileURLToPath(new URL("../../LICENSES/third-party-icons.json", import.meta.url));
const srcDir = fileURLToPath(new URL("../../src/", import.meta.url));

async function readPackFiles() {
    const executable = process.platform === "win32" ? "cmd.exe" : "npm";
    const args = process.platform === "win32"
        ? ["/d", "/c", "npm.cmd", "pack", "--dry-run", "--json"]
        : ["pack", "--dry-run", "--json"];
    const { stdout } = await execFileAsync(executable, args, {
        cwd: packageRoot,
    });

    const entries = JSON.parse(stdout);
    return extractPackFiles(Array.isArray(entries) ? entries : [entries]);
}

test("the real npm dry-run artifact satisfies the publishable artifact contract", async () => {
    const [files, manifest] = await Promise.all([
        readPackFiles(),
        readFile(manifestPath, "utf8").then(JSON.parse),
    ]);
    const publishableIcons = resolvePublishableIcons({ srcDir, manifestPath });
    const result = evaluatePackContents({ files, manifest, publishableIcons });

    assert.equal(result.ok, true, JSON.stringify(result.findings, null, 2));
});
