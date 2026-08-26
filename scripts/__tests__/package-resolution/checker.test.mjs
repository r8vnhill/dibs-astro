import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import {
    checkPackageResolutionContract,
    packageResolutionContracts,
    runPackageResolutionCheck,
} from "../../lib/package-resolution/checker.mjs";

const canonicalNpmrc = "@ravenhill:registry=https://gitlab.com/api/v4/projects/85449745/packages/npm/\n";
const staleNpmrc = "@ravenhill:registry=https://gitlab.com/api/v4/projects/85350050/packages/npm/\n";

const siteCoreContract = {
    name: "@ravenhill/site-core",
    exactVersion: "0.1.0",
    registryProject: "85449745",
    forbiddenLocalDir: "packages/site-core",
};

const siteShellContract = {
    name: "@ravenhill/astro-site-shell",
    registryProject: "85449745",
    specifier: "file:./vendor/astro-site-shell",
    installedVersion: "0.1.0",
    lockfileSpecifier: "file:./vendor/astro-site-shell",
    lockfileVersionPrefix: "file:vendor/astro-site-shell",
};

let cwd;

afterEach(async () => {
    if (cwd) {
        await rm(cwd, { recursive: true, force: true });
        cwd = undefined;
    }
});

async function setUpPublishedInstall() {
    cwd = await mkdtemp(path.join(os.tmpdir(), "package-resolution-checker-"));
    const dir = path.join(cwd, "node_modules", "@ravenhill", "site-core");
    await mkdir(dir, { recursive: true });
    await writeFile(
        path.join(dir, "package.json"),
        JSON.stringify({ name: "@ravenhill/site-core", version: "0.1.0" }),
    );
    return cwd;
}

describe("given the site-core resolution contract against the published-package state", () => {
    test("then it reports no findings", async () => {
        const cwd = await setUpPublishedInstall();
        const packageManifest = {
            dependencies: { "@ravenhill/site-core": "0.1.0" },
        };
        const lockfileContent = [
            "importers:",
            "",
            "  .:",
            "    dependencies:",
            "      '@ravenhill/site-core':",
            "        specifier: 0.1.0",
            "        version: 0.1.0",
        ].join("\n");

        const findings = await checkPackageResolutionContract(
            siteCoreContract,
            {
                cwd,
                packageManifest,
                npmrcContent: canonicalNpmrc,
                lockfileContent,
            },
        );

        expect(findings).toEqual([]);
    });
});

describe("given the site-core resolution contract against a workspace-style incompatible state", () => {
    test("then it reports findings for the workspace specifier, stale registry, and link resolution", async () => {
        cwd = await mkdtemp(
            path.join(os.tmpdir(), "package-resolution-checker-"),
        );
        const dir = path.join(cwd, "node_modules", "@ravenhill", "site-core");
        await mkdir(dir, { recursive: true });
        await writeFile(
            path.join(dir, "package.json"),
            JSON.stringify({ name: "@ravenhill/site-core", version: "0.1.0" }),
        );

        const packageManifest = {
            dependencies: { "@ravenhill/site-core": "workspace:*" },
        };
        const lockfileContent = [
            "importers:",
            "",
            "  .:",
            "    dependencies:",
            "      '@ravenhill/site-core':",
            "        specifier: workspace:*",
            "        version: link:packages/site-core",
        ].join("\n");

        const findings = await checkPackageResolutionContract(
            siteCoreContract,
            {
                cwd,
                packageManifest,
                npmrcContent: staleNpmrc,
                lockfileContent,
            },
        );

        const checks = findings.map((finding) => finding.check).sort();
        expect(checks).toEqual(["lockfile", "registry", "specifier"]);
    });
});

describe("given the pinned site-shell source-acquisition contract", () => {
    test("then it accepts the local file specifier and lockfile resolution", async () => {
        cwd = await mkdtemp(path.join(os.tmpdir(), "package-resolution-checker-"));
        const dir = path.join(cwd, "node_modules", "@ravenhill", "astro-site-shell");
        await mkdir(dir, { recursive: true });
        await writeFile(
            path.join(dir, "package.json"),
            JSON.stringify({ name: "@ravenhill/astro-site-shell", version: "0.1.0" }),
        );

        const lockfileContent = [
            "importers:",
            "",
            "  .:",
            "    dependencies:",
            "      '@ravenhill/astro-site-shell':",
            "        specifier: file:./vendor/astro-site-shell",
            "        version: file:vendor/astro-site-shell(astro@7.2.2)",
        ].join("\n");

        const findings = await checkPackageResolutionContract(
            siteShellContract,
            {
                cwd,
                packageManifest: { dependencies: { "@ravenhill/astro-site-shell": "file:./vendor/astro-site-shell" } },
                npmrcContent: canonicalNpmrc,
                lockfileContent,
            },
        );

        expect(findings).toEqual([]);
    });
});

describe("given the repository-wide package resolution check run against the live repository", () => {
    test("then it accepts the published site-core resolution", async () => {
        const result = await runPackageResolutionCheck({
            cwd: process.cwd(),
            contracts: packageResolutionContracts,
        });

        expect(result.exitCode).toBe(0);
        expect(result.findings).toEqual([]);
    });
});
