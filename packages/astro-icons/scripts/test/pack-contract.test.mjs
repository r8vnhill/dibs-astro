import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
    BLOCKED_PATTERNS,
    comparePublishedSvgSet,
    deriveRequiredLicenseFiles,
    evaluatePackContents,
    findBlockedFiles,
    findIncludedAssetsWithoutPermittedRedistribution,
    findMissingFiles,
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

const publishable = (...files) => files.map((file) => ({ file, exportName: file }));

const completeFiles = (extra = []) =>
    new Set([
        ...REQUIRED_RUNTIME_FILES,
        ...CORE_LICENSE_FILES,
        "package/dist/roshar.svg",
        "package/dist/scadrial.svg",
        ...extra,
    ]);

describe("module contract", () => {
    test("exports pure pack-contract helpers with no shell side effects on import", () => {
        assert.equal(typeof findMissingFiles, "function");
        assert.equal(typeof findBlockedFiles, "function");
        assert.equal(typeof comparePublishedSvgSet, "function");
        assert.equal(typeof deriveRequiredLicenseFiles, "function");
        assert.equal(typeof findIncludedAssetsWithoutPermittedRedistribution, "function");
        assert.equal(typeof evaluatePackContents, "function");
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
        const files = new Set([...REQUIRED_RUNTIME_FILES, "package/dist/roshar.svg"]);

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

describe("Feature: exact packaged SVG contract", () => {
    test("Scenario: exact publishable set passes", () => {
        const files = new Set(["package/dist/roshar.svg", "package/dist/scadrial.svg"]);

        assert.deepEqual(
            comparePublishedSvgSet({ files, publishableIcons: publishable("roshar.svg", "scadrial.svg") }),
            { missingAssets: [], unexpectedAssets: [] },
        );
    });

    test("Scenario: a publishable SVG is missing", () => {
        const files = new Set(["package/dist/roshar.svg"]);

        const result = comparePublishedSvgSet({
            files,
            publishableIcons: publishable("roshar.svg", "scadrial.svg"),
        });

        assert.deepEqual(result.missingAssets, ["package/dist/scadrial.svg"]);
        assert.deepEqual(result.unexpectedAssets, []);
    });

    test("Scenario: an excluded SVG is packaged", () => {
        const files = new Set(["package/dist/roshar.svg", "package/dist/bash.svg"]);

        const result = comparePublishedSvgSet({ files, publishableIcons: publishable("roshar.svg") });

        assert.deepEqual(result.unexpectedAssets, ["package/dist/bash.svg"]);
    });

    test("Scenario: equal counts with different names fail", () => {
        const files = new Set(["package/dist/roshar.svg", "package/dist/nalthis.svg"]);

        const result = comparePublishedSvgSet({
            files,
            publishableIcons: publishable("roshar.svg", "scadrial.svg"),
        });

        assert.deepEqual(result.missingAssets, ["package/dist/scadrial.svg"]);
        assert.deepEqual(result.unexpectedAssets, ["package/dist/nalthis.svg"]);
    });
});

describe("Feature: pack evaluator domain boundary", () => {
    test("Scenario: the evaluator requires publication policy, not source-directory knowledge", () => {
        // evaluatePackContents accepts publishableIcons directly; no src-directory count input
        // exists in its signature, so this call alone demonstrates the boundary.
        const result = evaluatePackContents({
            files: completeFiles(),
            manifest: buildManifest(),
            publishableIcons: publishable("roshar.svg", "scadrial.svg"),
        });

        assert.equal(result.ok, true);
    });
});

describe("deriveRequiredLicenseFiles", () => {
    test("always requires package license and core attribution files", () => {
        assert.deepEqual(deriveRequiredLicenseFiles(buildManifest()), CORE_LICENSE_FILES);
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
                    rights: { copyright: { licenseFile: "LICENSES/NIGHTBLOOD.txt" }, trademark: {} },
                }),
                buildAsset({
                    file: "nalthis.svg",
                    releaseDecision: { action: "pending" },
                    rights: { copyright: { licenseFile: "LICENSES/NALTHIS.txt" }, trademark: {} },
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

        assert.equal(required.filter((file) => file === "package/LICENSES/HONOR.txt").length, 1);
    });
});

describe("findIncludedAssetsWithoutPermittedRedistribution", () => {
    test("reports no finding for included assets with permitted redistribution", () => {
        const findings = findIncludedAssetsWithoutPermittedRedistribution(
            buildManifest([
                buildAsset({ releaseDecision: { action: "include" }, redistribution: { conclusion: "permitted" } }),
            ]),
        );

        assert.deepEqual(findings, []);
    });

    for (const conclusion of ["restricted", "permission-required", "undetermined"]) {
        test(`reports included assets with ${conclusion} redistribution`, () => {
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
    }

    for (const action of ["exclude", "pending"]) {
        test(`ignores ${action} assets with undetermined redistribution`, () => {
            const findings = findIncludedAssetsWithoutPermittedRedistribution(
                buildManifest([
                    buildAsset({ releaseDecision: { action }, redistribution: { conclusion: "undetermined" } }),
                ]),
            );

            assert.deepEqual(findings, []);
        });
    }
});

describe("evaluatePackContents", () => {
    test("passes when every pack-contract category is satisfied", () => {
        const result = evaluatePackContents({
            files: completeFiles(),
            manifest: buildManifest(),
            publishableIcons: publishable("roshar.svg", "scadrial.svg"),
        });

        assert.equal(result.ok, true);
        assert.deepEqual(result.findings, {
            missingFiles: [],
            blockedFiles: [],
            missingAssets: [],
            unexpectedAssets: [],
            redistribution: [],
        });
    });

    test("reports missing, blocked, missing-asset, unexpected-asset, and redistribution findings together", () => {
        const files = completeFiles(["package/scripts/urithiru.mjs", "package/dist/bash.svg"]);
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
            publishableIcons: publishable("roshar.svg", "scadrial.svg"),
        });

        assert.equal(result.ok, false);
        assert.ok(result.findings.missingFiles.includes("package/LICENSE"));
        assert.ok(result.findings.blockedFiles.includes("package/scripts/urithiru.mjs"));
        assert.deepEqual(result.findings.missingAssets, ["package/dist/scadrial.svg"]);
        assert.deepEqual(result.findings.unexpectedAssets, ["package/dist/bash.svg"]);
        assert.equal(result.findings.redistribution.length, 1);
    });

    test("findings are unchanged when packed files are reordered", () => {
        const manifest = buildManifest([
            buildAsset({ releaseDecision: { action: "include" }, redistribution: { conclusion: "undetermined" } }),
        ]);
        const publishableIcons = publishable("roshar.svg", "scadrial.svg");
        const files = [...completeFiles(["package/scripts/urithiru.mjs"])];
        const reversed = [...files].reverse();

        assert.deepEqual(
            evaluatePackContents({ files, manifest, publishableIcons }).findings,
            evaluatePackContents({ files: reversed, manifest, publishableIcons }).findings,
        );
    });

    test("adding an unrelated file does not remove an existing finding", () => {
        const files = completeFiles();
        files.delete("package/LICENSE");
        const manifest = buildManifest();
        const publishableIcons = publishable("roshar.svg", "scadrial.svg");

        const before = evaluatePackContents({ files, manifest, publishableIcons });
        files.add("package/NOTICE.txt");
        const after = evaluatePackContents({ files, manifest, publishableIcons });

        assert.ok(after.findings.missingFiles.includes("package/LICENSE"));
        assert.deepEqual(after.findings.missingFiles, before.findings.missingFiles);
    });
});
