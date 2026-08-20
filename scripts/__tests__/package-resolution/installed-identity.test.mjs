import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import { checkInstalledPackageIdentity } from "../../lib/package-resolution/installed-identity.mjs";

let cwd;

afterEach(async () => {
    if (cwd) {
        await rm(cwd, { recursive: true, force: true });
        cwd = undefined;
    }
});

async function writeInstalledManifest(cwd, packageName, manifest) {
    const dir = path.join(cwd, "node_modules", ...packageName.split("/"));
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "package.json"), JSON.stringify(manifest));
    return dir;
}

describe("given an installed package's filesystem identity", () => {
    test("then a real published install with matching name/version is accepted", async () => {
        cwd = await mkdtemp(path.join(os.tmpdir(), "package-resolution-"));
        await writeInstalledManifest(cwd, "@ravenhill/site-core", { name: "@ravenhill/site-core", version: "0.1.0" });

        const result = await checkInstalledPackageIdentity({
            cwd,
            packageName: "@ravenhill/site-core",
            expectedVersion: "0.1.0",
            forbiddenLocalDir: "packages/site-core",
        });

        expect(result.valid).toBe(true);
    });

    test("then a missing installed package is rejected", async () => {
        cwd = await mkdtemp(path.join(os.tmpdir(), "package-resolution-"));

        const result = await checkInstalledPackageIdentity({
            cwd,
            packageName: "@ravenhill/site-core",
            expectedVersion: "0.1.0",
            forbiddenLocalDir: "packages/site-core",
        });

        expect(result.valid).toBe(false);
    });

    test("then a version mismatch is rejected", async () => {
        cwd = await mkdtemp(path.join(os.tmpdir(), "package-resolution-"));
        await writeInstalledManifest(cwd, "@ravenhill/site-core", { name: "@ravenhill/site-core", version: "0.0.9" });

        const result = await checkInstalledPackageIdentity({
            cwd,
            packageName: "@ravenhill/site-core",
            expectedVersion: "0.1.0",
            forbiddenLocalDir: "packages/site-core",
        });

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("0.0.9");
    });

    test("then an installed package symlinked back into the forbidden local workspace directory is rejected", async () => {
        cwd = await mkdtemp(path.join(os.tmpdir(), "package-resolution-"));

        const localSourceDir = path.join(cwd, "packages", "site-core");
        await mkdir(localSourceDir, { recursive: true });
        await writeFile(path.join(localSourceDir, "package.json"), JSON.stringify({ name: "@ravenhill/site-core", version: "0.1.0" }));

        const scopeDir = path.join(cwd, "node_modules", "@ravenhill");
        await mkdir(scopeDir, { recursive: true });
        const linkPath = path.join(scopeDir, "site-core");

        try {
            await symlink(localSourceDir, linkPath, os.platform() === "win32" ? "junction" : "dir");
        } catch (error) {
            // Symlink/junction creation can be restricted in sandboxed CI environments; skip rather
            // than fail on an environment limitation unrelated to the resolver logic under test.
            console.warn(`Skipping symlink-based assertion: ${error.message}`);
            return;
        }

        const result = await checkInstalledPackageIdentity({
            cwd,
            packageName: "@ravenhill/site-core",
            expectedVersion: "0.1.0",
            forbiddenLocalDir: "packages/site-core",
        });

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("packages/site-core");
    });
});
