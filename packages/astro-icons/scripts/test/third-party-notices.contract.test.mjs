import { suite, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join } from "node:path";

import {
    DEFAULT_INVENTORY_PATH,
    DEFAULT_LICENSES_DIR,
    DEFAULT_MANIFEST_PATH,
    DEFAULT_NOTICE_PATH,
    main,
    parseArgs,
    renderThirdPartyNotice,
    runGenerate,
} from "../generate-third-party-notices.mjs";

// Sanderson-themed fixture names only; never the real nine-asset production manifest.
const buildPhosphor = (overrides = {}) => ({
    project: "Phosphor Icons",
    copyright: {
        concludedLicense: "MIT",
        copyrightNotice: "Copyright (c) 2020-2024 Phosphor Icons",
    },
    source: { evidenceStatus: "unresolved" },
    ...overrides,
});

const buildAsset = (overrides = {}) => ({
    displayName: "Roshar logo",
    assetType: "logo",
    file: "roshar.svg",
    rights: {
        copyright: { concludedLicense: "NOASSERTION", basis: null },
        trademark: {
            applies: "unknown",
            owner: null,
            policyUrl: null,
            notes: null,
        },
    },
    redistribution: { conclusion: "undetermined" },
    releaseDecision: { action: "exclude" },
    ...overrides,
});

const buildInventory = (files = ["roshar.svg"]) => ({
    icons: files.map((file) => ({
        file,
        exportName: file.replace(/\.svg$/u, ""),
        group: "custom",
    })),
});

const buildManifest = (assets = [buildAsset()]) => ({
    phosphor: buildPhosphor(),
    assets,
});

async function withGeneratorFixture(fn) {
    const dir = await mkdtemp(join(tmpdir(), "third-party-notices-"));
    try {
        const licensesDir = join(dir, "LICENSES");
        const migrationDir = join(dir, "migration");
        await mkdir(licensesDir, { recursive: true });
        await mkdir(migrationDir, { recursive: true });

        const paths = {
            dir,
            licensesDir,
            manifestPath: join(licensesDir, "third-party-icons.json"),
            inventoryPath: join(migrationDir, "icon-inventory.json"),
            noticePath: join(licensesDir, "THIRD_PARTY.md"),
        };

        return await fn(paths);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}

const writeJson = async (path, value) =>
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");

suite("module contract", () => {
    test("exports the CLI orchestration entry points", () => {
        assert.equal(typeof parseArgs, "function");
        assert.equal(typeof runGenerate, "function");
        assert.equal(typeof main, "function");
    });
});

suite("given third-party notice CLI arguments", () => {
    test("then write mode is selected from --write", () => {
        assert.deepEqual(parseArgs(["--write"]), { mode: "write" });
    });

    test("then check mode is selected from --check", () => {
        assert.deepEqual(parseArgs(["--check"]), { mode: "check" });
    });

    test("then missing mode returns an error", () => {
        assert.match(parseArgs([]).error, /mode/u);
    });

    test("then both modes together return an error", () => {
        assert.match(parseArgs(["--write", "--check"]).error, /exactly one/u);
    });

    test("then unknown flags return an error", () => {
        assert.match(parseArgs(["--force"]).error, /unknown/iu);
    });
});

suite("given default generator paths", () => {
    test("then all defaults resolve inside the astro-icons package", () => {
        assert.equal(isAbsolute(DEFAULT_MANIFEST_PATH), true);
        assert.equal(isAbsolute(DEFAULT_INVENTORY_PATH), true);
        assert.equal(isAbsolute(DEFAULT_NOTICE_PATH), true);
        assert.equal(isAbsolute(DEFAULT_LICENSES_DIR), true);

        assert.equal(basename(DEFAULT_MANIFEST_PATH), "third-party-icons.json");
        assert.equal(basename(DEFAULT_INVENTORY_PATH), "icon-inventory.json");
        assert.equal(basename(DEFAULT_NOTICE_PATH), "THIRD_PARTY.md");
        assert.equal(basename(DEFAULT_LICENSES_DIR), "LICENSES");
    });
});

suite("given third-party notice generation inputs", () => {
    test("then invalid manifests prevent write mode from overwriting the notice", async () => {
        await withGeneratorFixture(async (paths) => {
            const staleContent = "stale notice\n";
            await writeJson(
                paths.inventoryPath,
                buildInventory(["roshar.svg"]),
            );
            await writeJson(
                paths.manifestPath,
                buildManifest([
                    buildAsset({
                        releaseDecision: {
                            action: "risk-accepted",
                            riskAcceptance: null,
                        },
                    }),
                ]),
            );
            await writeFile(paths.noticePath, staleContent, "utf8");

            const result = await runGenerate({
                mode: "write",
                manifestPath: paths.manifestPath,
                inventoryPath: paths.inventoryPath,
                noticePath: paths.noticePath,
                licensesDir: paths.licensesDir,
            });

            assert.equal(result.ok, false);
            assert.match(result.message, /validation failed/u);
            assert.ok(
                result.findings.some((finding) =>
                    finding.startsWith("releaseDecision.action.unsupported"),
                ),
            );
            assert.equal(
                await readFile(paths.noticePath, "utf8"),
                staleContent,
            );
        });
    });

    test("then write mode creates the generated notice after validation passes", async () => {
        await withGeneratorFixture(async (paths) => {
            const manifest = buildManifest();
            await writeJson(
                paths.inventoryPath,
                buildInventory(["roshar.svg"]),
            );
            await writeJson(paths.manifestPath, manifest);

            const result = await runGenerate({
                mode: "write",
                manifestPath: paths.manifestPath,
                inventoryPath: paths.inventoryPath,
                noticePath: paths.noticePath,
                licensesDir: paths.licensesDir,
            });

            assert.equal(result.ok, true);
            assert.equal(result.changed, true);
            assert.equal(
                await readFile(paths.noticePath, "utf8"),
                renderThirdPartyNotice(manifest),
            );
        });
    });

    test("then check mode passes when the notice is current", async () => {
        await withGeneratorFixture(async (paths) => {
            const manifest = buildManifest([
                buildAsset({
                    displayName: "Nalthis logo",
                    file: "nalthis.svg",
                }),
            ]);
            await writeJson(
                paths.inventoryPath,
                buildInventory(["nalthis.svg"]),
            );
            await writeJson(paths.manifestPath, manifest);
            await writeFile(
                paths.noticePath,
                renderThirdPartyNotice(manifest),
                "utf8",
            );

            const result = await runGenerate({
                mode: "check",
                manifestPath: paths.manifestPath,
                inventoryPath: paths.inventoryPath,
                noticePath: paths.noticePath,
                licensesDir: paths.licensesDir,
            });

            assert.equal(result.ok, true);
            assert.equal(result.changed, false);
        });
    });

    test("then check mode fails on stale content without rewriting", async () => {
        await withGeneratorFixture(async (paths) => {
            const staleContent = "stale notice\n";
            await writeJson(
                paths.inventoryPath,
                buildInventory(["scadrial.svg"]),
            );
            await writeJson(
                paths.manifestPath,
                buildManifest([
                    buildAsset({
                        displayName: "Scadrial logo",
                        file: "scadrial.svg",
                    }),
                ]),
            );
            await writeFile(paths.noticePath, staleContent, "utf8");

            const result = await runGenerate({
                mode: "check",
                manifestPath: paths.manifestPath,
                inventoryPath: paths.inventoryPath,
                noticePath: paths.noticePath,
                licensesDir: paths.licensesDir,
            });

            assert.equal(result.ok, false);
            assert.match(result.message, /out of date/u);
            assert.equal(
                await readFile(paths.noticePath, "utf8"),
                staleContent,
            );
        });
    });

    test("then check mode fails clearly when the notice is missing", async () => {
        await withGeneratorFixture(async (paths) => {
            await writeJson(paths.inventoryPath, buildInventory(["sel.svg"]));
            await writeJson(
                paths.manifestPath,
                buildManifest([
                    buildAsset({ displayName: "Sel logo", file: "sel.svg" }),
                ]),
            );

            const result = await runGenerate({
                mode: "check",
                manifestPath: paths.manifestPath,
                inventoryPath: paths.inventoryPath,
                noticePath: paths.noticePath,
                licensesDir: paths.licensesDir,
            });

            assert.equal(result.ok, false);
            assert.match(result.message, /missing/u);
            assert.ok(
                result.findings.includes(
                    "notice.missing: LICENSES/THIRD_PARTY.md is missing",
                ),
            );
        });
    });
});

suite("given the third-party notice CLI main function", () => {
    const withExitCode = async (fn) => {
        const previousExitCode = process.exitCode;
        process.exitCode = undefined;
        try {
            return await fn();
        } finally {
            process.exitCode = previousExitCode;
        }
    };

    test("then parse failures are printed and set a failing exit code", async () => {
        await withExitCode(async () => {
            const errors = [];

            await main({
                argv: ["--force"],
                stdout: () => {},
                stderr: (message) => errors.push(message),
                runGenerateFn: async () => {
                    throw new Error("runGenerate should not be called");
                },
            });

            assert.equal(process.exitCode, 1);
            assert.match(errors.join("\n"), /unknown/iu);
        });
    });

    test("then run failures print findings and set a failing exit code", async () => {
        await withExitCode(async () => {
            const errors = [];

            await main({
                argv: ["--check"],
                stdout: () => {},
                stderr: (message) => errors.push(message),
                runGenerateFn: async () => ({
                    ok: false,
                    message: "Third-party notice is out of date.",
                    findings: [
                        "notice.drift: LICENSES/THIRD_PARTY.md is stale",
                    ],
                }),
            });

            assert.equal(process.exitCode, 1);
            assert.match(errors.join("\n"), /out of date/u);
            assert.match(errors.join("\n"), /notice\.drift/u);
        });
    });

    test("then successful runs print a concise summary without failing", async () => {
        await withExitCode(async () => {
            const output = [];

            await main({
                argv: ["--write"],
                stdout: (message) => output.push(message),
                stderr: () => {},
                runGenerateFn: async () => ({
                    ok: true,
                    changed: true,
                    message: "Third-party notice updated.",
                }),
            });

            assert.equal(process.exitCode, undefined);
            assert.deepEqual(output, ["Third-party notice updated."]);
        });
    });
});
