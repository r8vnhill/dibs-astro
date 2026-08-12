import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
    BLOCKED_PATTERNS,
    checkSvgParity,
    deriveRequiredLicenseFiles,
    evaluatePackContents,
    findBlockedFiles,
    findIncludedAssetsWithoutPermittedRedistribution,
    findMissingFiles,
    main,
    REQUIRED_RUNTIME_FILES,
} from "../assert-pack-files.mjs";

// Sanderson-themed fixture names only; never the real 1,521-icon production tarball.
const CORE_LICENSE_FILES = [
    "package/LICENSE",
    "package/LICENSES/PHOSPHOR.txt",
    "package/LICENSES/README.md",
    "package/LICENSES/THIRD_PARTY.md",
    "package/LICENSES/third-party-icons.json",
];

const buildAsset = (overrides = {}) => ({
    file: "roshar.svg",
    releaseDecision: { action: "exclude" },
    redistribution: { conclusion: "undetermined" },
    rights: {
        copyright: { licenseFile: null },
        trademark: {
            licenseFile: null,
            permissionFile: null,
            policyFile: null,
        },
    },
    ...overrides,
});

const buildManifest = (assets = []) => ({ assets });

const completeFiles = (extra = []) =>
    new Set([
        ...REQUIRED_RUNTIME_FILES,
        ...CORE_LICENSE_FILES,
        "package/dist/roshar.svg",
        "package/dist/scadrial.svg",
        ...extra,
    ]);

if (test.each === undefined) {
    test.each = (cases) => (name, fn) => {
        for (const testCase of cases) {
            test(name.replaceAll("%s", String(testCase)), () => fn(testCase));
        }
    };
}

describe("module contract", () => {
    test("exports pure helpers and an injectable main without running CLI side effects on import", () => {
        assert.equal(typeof findMissingFiles, "function");
        assert.equal(typeof findBlockedFiles, "function");
        assert.equal(typeof checkSvgParity, "function");
        assert.equal(typeof deriveRequiredLicenseFiles, "function");
        assert.equal(
            typeof findIncludedAssetsWithoutPermittedRedistribution,
            "function",
        );
        assert.equal(typeof evaluatePackContents, "function");
        assert.equal(typeof main, "function");
    });

    test("main adapts injected shell effects and returns success without process exit", async () => {
        const calls = [];
        const files = completeFiles();
        const entries = [{ filename: "astro-icons-0.1.0.tgz" }];
        const status = await main({
            argv: ["--pack"],
            dependencies: {
                readPackFiles: (argv) => {
                    calls.push(["readPackFiles", argv]);
                    return Promise.resolve({ entries, files });
                },
                countSourceSvgs: () => {
                    calls.push("countSourceSvgs");
                    return Promise.resolve(2);
                },
                readManifest: () => {
                    calls.push("readManifest");
                    return Promise.resolve(buildManifest());
                },
                writeDiagnostic: () => calls.push("writeDiagnostic"),
                writeOutput: (message) => calls.push(["writeOutput", message]),
                removePackedTarballs: (receivedEntries) => calls.push(["removePackedTarballs", receivedEntries]),
            },
        });

        assert.equal(status, 0);
        assert.equal(
            calls.filter((call) => call === "countSourceSvgs").length,
            1,
        );
        assert.equal(
            calls.filter((call) => call === "readManifest").length,
            1,
        );
        assert.deepEqual(calls.at(-1), ["removePackedTarballs", entries]);
    });

    test("main renders independent findings and returns failure", async () => {
        const diagnostics = [];
        const files = completeFiles(["package/scripts/urithiru.mjs"]);
        files.delete("package/LICENSE");

        const status = await main({
            dependencies: {
                readPackFiles: async () => ({ entries: [], files }),
                countSourceSvgs: async () => 2,
                readManifest: async () =>
                    buildManifest([
                        buildAsset({
                            releaseDecision: { action: "include" },
                            redistribution: { conclusion: "restricted" },
                        }),
                    ]),
                writeDiagnostic: (message) => diagnostics.push(message),
                writeOutput: () => assert.fail("failure must not be reported as success"),
                removePackedTarballs: () => assert.fail("failed packs must not be cleaned"),
            },
        });

        assert.equal(status, 1);
        assert.ok(diagnostics.some((message) => message.includes("Missing required files")));
        assert.ok(diagnostics.some((message) => message.includes("Blocked files present")));
        assert.ok(diagnostics.some((message) => message.includes("redistribution.notPermitted")));
    });
});

describe("findMissingFiles", () => {
    test("reports no findings when every required runtime file is present", () => {
        const files = new Set([
            ...REQUIRED_RUNTIME_FILES,
            "package/dist/roshar.svg",
            "package/dist/scadrial.svg",
        ]);

        assert.deepEqual(findMissingFiles(files, REQUIRED_RUNTIME_FILES), []);
    });

    test("reports each absent required runtime file", () => {
        const files = new Set(["package/README.md", "package/package.json"]);

        const findings = findMissingFiles(files, REQUIRED_RUNTIME_FILES);

        assert.ok(findings.includes("package/dist/index.js"));
        assert.ok(findings.includes("package/dist/index.d.ts"));
        assert.ok(findings.includes("package/dist/index.js.map"));
    });
});

describe("findBlockedFiles", () => {
    test("reports no findings when no blocked internals are present", () => {
        const files = new Set([
            ...REQUIRED_RUNTIME_FILES,
            "package/dist/roshar.svg",
        ]);

        assert.deepEqual(findBlockedFiles(files, BLOCKED_PATTERNS), []);
    });

    test("reports AGENTS.md, src/, scripts/, migration/, tsup.config.ts, and tsconfig.json when present", () => {
        const files = new Set([
            ...REQUIRED_RUNTIME_FILES,
            "package/AGENTS.md",
            "package/src/urithiru.svg",
            "package/scripts/lib/roshar.mjs",
            "package/migration/icon-inventory.json",
            "package/tsup.config.ts",
            "package/tsconfig.json",
        ]);

        const findings = findBlockedFiles(files, BLOCKED_PATTERNS);

        assert.ok(findings.includes("package/AGENTS.md"));
        assert.ok(findings.includes("package/src/urithiru.svg"));
        assert.ok(findings.includes("package/scripts/lib/roshar.mjs"));
        assert.ok(findings.includes("package/migration/icon-inventory.json"));
        assert.ok(findings.includes("package/tsup.config.ts"));
        assert.ok(findings.includes("package/tsconfig.json"));
    });
});

describe("checkSvgParity", () => {
    test("reports no finding when the SVG counts match", () => {
        const files = new Set([
            "package/dist/roshar.svg",
            "package/dist/scadrial.svg",
        ]);

        assert.deepEqual(checkSvgParity(files, 2), []);
    });

    test("reports a finding when src has SVGs but dist in the tarball has fewer", () => {
        const files = new Set(["package/dist/roshar.svg"]);

        const findings = checkSvgParity(files, 2);

        assert.equal(findings.length, 1);
        assert.match(findings[0], /2/u);
        assert.match(findings[0], /1/u);
    });

    test("does not report a finding when src has zero SVGs", () => {
        const files = new Set([]);

        assert.deepEqual(checkSvgParity(files, 0), []);
    });
});

describe("deriveRequiredLicenseFiles", () => {
    test("always requires package license and core attribution files", () => {
        const required = deriveRequiredLicenseFiles(buildManifest());

        assert.deepEqual(required, CORE_LICENSE_FILES);
    });

    test("requires included asset license, permission, and policy references", () => {
        const required = deriveRequiredLicenseFiles(
            buildManifest([
                buildAsset({
                    file: "roshar.svg",
                    releaseDecision: { action: "include" },
                    rights: {
                        copyright: { licenseFile: "LICENSES/SHARDBLADE.txt" },
                        trademark: {
                            licenseFile: "LICENSES/HONOR.txt",
                            permissionFile: "LICENSES/URITHIRU.txt",
                            policyFile: "LICENSES/RADIANT_POLICY.txt",
                        },
                    },
                }),
            ]),
        );

        assert.ok(required.includes("package/LICENSES/SHARDBLADE.txt"));
        assert.ok(required.includes("package/LICENSES/HONOR.txt"));
        assert.ok(required.includes("package/LICENSES/URITHIRU.txt"));
        assert.ok(required.includes("package/LICENSES/RADIANT_POLICY.txt"));
    });

    test("ignores excluded and pending asset references", () => {
        const required = deriveRequiredLicenseFiles(
            buildManifest([
                buildAsset({
                    file: "nightblood.svg",
                    releaseDecision: { action: "exclude" },
                    rights: {
                        copyright: { licenseFile: "LICENSES/NIGHTBLOOD.txt" },
                        trademark: {},
                    },
                }),
                buildAsset({
                    file: "nalthis.svg",
                    releaseDecision: { action: "pending" },
                    rights: {
                        copyright: { licenseFile: "LICENSES/NALTHIS.txt" },
                        trademark: {},
                    },
                }),
            ]),
        );

        assert.ok(!required.includes("package/LICENSES/NIGHTBLOOD.txt"));
        assert.ok(!required.includes("package/LICENSES/NALTHIS.txt"));
    });

    test("deduplicates repeated included asset references", () => {
        const required = deriveRequiredLicenseFiles(
            buildManifest([
                buildAsset({
                    releaseDecision: { action: "include" },
                    rights: {
                        copyright: { licenseFile: "LICENSES/HONOR.txt" },
                        trademark: { licenseFile: "LICENSES/HONOR.txt" },
                    },
                }),
            ]),
        );

        assert.equal(
            required.filter((file) => file === "package/LICENSES/HONOR.txt")
                .length,
            1,
        );
    });
});

describe("findIncludedAssetsWithoutPermittedRedistribution", () => {
    test("reports no finding for included assets with permitted redistribution", () => {
        const findings = findIncludedAssetsWithoutPermittedRedistribution(
            buildManifest([
                buildAsset({
                    releaseDecision: { action: "include" },
                    redistribution: { conclusion: "permitted" },
                }),
            ]),
        );

        assert.deepEqual(findings, []);
    });

    test.each([
        "restricted",
        "permission-required",
        "undetermined",
    ])("reports included assets with %s redistribution", (conclusion) => {
        const findings = findIncludedAssetsWithoutPermittedRedistribution(
            buildManifest([
                buildAsset({
                    file: "scadrial.svg",
                    releaseDecision: { action: "include" },
                    redistribution: { conclusion },
                }),
            ]),
        );

        assert.equal(findings.length, 1);
        assert.match(findings[0], /scadrial\.svg/u);
        assert.match(findings[0], new RegExp(conclusion, "u"));
    });

    test.each(["exclude", "pending"])(
        "ignores %s assets with undetermined redistribution",
        (action) => {
            const findings = findIncludedAssetsWithoutPermittedRedistribution(
                buildManifest([
                    buildAsset({
                        releaseDecision: { action },
                        redistribution: { conclusion: "undetermined" },
                    }),
                ]),
            );

            assert.deepEqual(findings, []);
        },
    );
});

describe("evaluatePackContents", () => {
    test("passes when every pack-contract category is satisfied", () => {
        const result = evaluatePackContents({
            files: completeFiles(),
            manifest: buildManifest(),
            srcSvgCount: 2,
        });

        assert.equal(result.ok, true);
        assert.deepEqual(result.findings, {
            missingFiles: [],
            blockedFiles: [],
            svgParity: [],
            redistribution: [],
        });
    });

    test("reports missing, blocked, SVG parity, and redistribution findings together", () => {
        const files = completeFiles(["package/scripts/urithiru.mjs"]);
        files.delete("package/LICENSE");
        files.delete("package/dist/scadrial.svg");

        const result = evaluatePackContents({
            files,
            manifest: buildManifest([
                buildAsset({
                    file: "roshar.svg",
                    releaseDecision: { action: "include" },
                    redistribution: { conclusion: "undetermined" },
                }),
            ]),
            srcSvgCount: 2,
        });

        assert.equal(result.ok, false);
        assert.ok(result.findings.missingFiles.includes("package/LICENSE"));
        assert.ok(
            result.findings.blockedFiles.includes(
                "package/scripts/urithiru.mjs",
            ),
        );
        assert.equal(result.findings.svgParity.length, 1);
        assert.equal(result.findings.redistribution.length, 1);
    });

    test("findings are unchanged when packed files are reordered", () => {
        const manifest = buildManifest([
            buildAsset({
                releaseDecision: { action: "include" },
                redistribution: { conclusion: "undetermined" },
            }),
        ]);
        const files = [...completeFiles(["package/scripts/urithiru.mjs"])];
        const reversed = [...files].reverse();

        assert.deepEqual(
            evaluatePackContents({ files, manifest, srcSvgCount: 2 }).findings,
            evaluatePackContents({ files: reversed, manifest, srcSvgCount: 2 }).findings,
        );
    });

    test("adding an unrelated file does not remove an existing finding", () => {
        const files = completeFiles();
        files.delete("package/LICENSE");
        const manifest = buildManifest();

        const before = evaluatePackContents({ files, manifest, srcSvgCount: 2 });
        files.add("package/NOTICE.txt");
        const after = evaluatePackContents({ files, manifest, srcSvgCount: 2 });

        assert.ok(after.findings.missingFiles.includes("package/LICENSE"));
        assert.deepEqual(after.findings.missingFiles, before.findings.missingFiles);
    });
});
