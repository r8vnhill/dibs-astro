import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
    RELEASE_DECISION_ACTIONS,
    REDISTRIBUTION_CONCLUSIONS,
    validateAttributionCoverage,
    validateReleaseDecisions,
    validatePlaceholders,
    validateLicenseFileReferences,
    validateManifest,
} from "../lib/license-metadata.mjs";

// Sanderson-themed fixture names only; never the real nine-asset production manifest.
const buildAsset = (overrides = {}) => ({
    file: "roshar.svg",
    releaseDecision: { action: "exclude", riskAcceptance: null },
    redistribution: {
        conclusion: "undetermined",
        rationale: "Candidate source found but not byte-verified.",
    },
    rights: {
        copyright: { licenseFile: null, basis: null },
        trademark: { licenseFile: null },
    },
    notes: [],
    ...overrides,
});

describe("module contract", () => {
    test("exports the frozen release decision and redistribution vocabularies", () => {
        assert.deepEqual(RELEASE_DECISION_ACTIONS, [
            "include",
            "exclude",
            "pending",
        ]);
        assert.deepEqual(REDISTRIBUTION_CONCLUSIONS, [
            "permitted",
            "restricted",
            "permission-required",
            "undetermined",
        ]);
        assert.ok(Object.isFrozen(RELEASE_DECISION_ACTIONS));
        assert.ok(Object.isFrozen(REDISTRIBUTION_CONCLUSIONS));
    });
});

describe("validateAttributionCoverage", () => {
    test("returns no findings when the inventory and manifest file sets match exactly", () => {
        const findings = validateAttributionCoverage(
            ["roshar.svg", "scadrial.svg"],
            [{ file: "roshar.svg" }, { file: "scadrial.svg" }],
        );
        assert.deepEqual(findings, []);
    });

    test("reports missing, unexpected, and duplicate files together in one call", () => {
        const findings = validateAttributionCoverage(
            ["roshar.svg", "scadrial.svg"],
            [
                { file: "roshar.svg" },
                { file: "nalthis.svg" },
                { file: "roshar.svg" },
            ],
        );

        assert.ok(findings.includes("coverage.missing: scadrial.svg"));
        assert.ok(findings.includes("coverage.unexpected: nalthis.svg"));
        assert.ok(findings.includes("coverage.duplicate: roshar.svg"));
    });
});

describe("validateReleaseDecisions", () => {
    test("passes assets with valid release actions and redistribution conclusions", () => {
        const findings = validateReleaseDecisions([
            buildAsset({
                file: "sel.svg",
                releaseDecision: { action: "include", riskAcceptance: null },
                redistribution: {
                    conclusion: "permitted",
                    rationale: "Clear.",
                },
            }),
        ]);
        assert.deepEqual(findings, []);
    });

    for (const value of ["risk-accepted", "permitted"]) {
        test(`rejects an unsupported releaseDecision.action value: ${value}`, () => {
            const findings = validateReleaseDecisions([
                buildAsset({
                    file: "roshar.svg",
                    releaseDecision: { action: value, riskAcceptance: null },
                }),
            ]);
            assert.ok(
                findings.includes(
                    `releaseDecision.action.unsupported: roshar.svg -> ${value}`,
                ),
            );
        });
    }

    for (const value of ["verified", "risk-accepted"]) {
        test(`rejects an unsupported redistribution.conclusion value: ${value}`, () => {
            const findings = validateReleaseDecisions([
                buildAsset({
                    file: "scadrial.svg",
                    redistribution: { conclusion: value, rationale: "n/a" },
                }),
            ]);
            assert.ok(
                findings.includes(
                    `redistribution.conclusion.unsupported: scadrial.svg -> ${value}`,
                ),
            );
        });
    }

    test("reports multiple invalid assets as multiple findings", () => {
        const findings = validateReleaseDecisions([
            buildAsset({
                file: "roshar.svg",
                releaseDecision: {
                    action: "risk-accepted",
                    riskAcceptance: null,
                },
            }),
            buildAsset({
                file: "scadrial.svg",
                redistribution: { conclusion: "verified", rationale: "n/a" },
            }),
        ]);
        assert.equal(findings.length, 2);
    });
});

describe("validatePlaceholders", () => {
    test("reports nested placeholder text with its field path", () => {
        const findings = validatePlaceholders([
            buildAsset({
                file: "roshar.svg",
                rights: {
                    copyright: { licenseFile: null, basis: "TBD" },
                    trademark: { licenseFile: null },
                },
            }),
        ]);
        assert.ok(
            findings.some(
                (finding) =>
                    finding.includes("roshar.svg") &&
                    finding.includes("rights.copyright.basis") &&
                    finding.includes("TBD"),
            ),
        );
    });

    test("matches placeholder text case-insensitively inside array fields", () => {
        const findings = validatePlaceholders([
            buildAsset({
                file: "luthadel.svg",
                notes: ["Probably copied from a source"],
            }),
        ]);
        assert.ok(
            findings.some(
                (finding) =>
                    finding.includes("luthadel.svg") &&
                    finding.includes("notes[0]"),
            ),
        );
    });

    test("does not flag ordinary, non-placeholder strings", () => {
        const findings = validatePlaceholders([
            buildAsset({
                file: "urithiru.svg",
                notes: ["Excluded pending stronger evidence."],
            }),
        ]);
        assert.deepEqual(findings, []);
    });
});

describe("validateLicenseFileReferences", () => {
    test("passes when a referenced license file exists in the supplied filename set", () => {
        const findings = validateLicenseFileReferences(
            [
                buildAsset({
                    file: "roshar.svg",
                    rights: {
                        copyright: { licenseFile: "HONOR.txt", basis: null },
                        trademark: { licenseFile: null },
                    },
                }),
            ],
            ["HONOR.txt"],
        );
        assert.deepEqual(findings, []);
    });

    test("reports a license file reference missing from the supplied filename set", () => {
        const findings = validateLicenseFileReferences(
            [
                buildAsset({
                    file: "roshar.svg",
                    rights: {
                        copyright: { licenseFile: "ODIUM.txt", basis: null },
                        trademark: { licenseFile: null },
                    },
                }),
            ],
            ["HONOR.txt"],
        );
        assert.ok(
            findings.includes(
                "licenseFile.missing: roshar.svg rights.copyright.licenseFile -> ODIUM.txt",
            ),
        );
    });

    test("ignores null or absent license file references", () => {
        const findings = validateLicenseFileReferences(
            [buildAsset({ file: "scadrial.svg" })],
            [],
        );
        assert.deepEqual(findings, []);
    });
});

describe("validateManifest", () => {
    test("returns ok: true with no findings for a valid synthetic manifest", () => {
        const inventory = {
            icons: [
                { file: "roshar.svg", exportName: "Roshar", group: "custom" },
                {
                    file: "scadrial.svg",
                    exportName: "Scadrial",
                    group: "phosphor",
                },
            ],
        };
        const manifest = {
            assets: [buildAsset({ file: "roshar.svg" })],
        };

        const result = validateManifest(inventory, manifest, []);
        assert.deepEqual(result, { ok: true, findings: [] });
    });

    test("collects all violation categories together when every check fails", () => {
        const inventory = {
            icons: [
                {
                    file: "scadrial.svg",
                    exportName: "Scadrial",
                    group: "custom",
                },
            ],
        };
        const manifest = {
            assets: [
                buildAsset({
                    file: "nalthis.svg",
                    releaseDecision: {
                        action: "risk-accepted",
                        riskAcceptance: null,
                    },
                    rights: {
                        copyright: { licenseFile: "ODIUM.txt", basis: "TBD" },
                        trademark: { licenseFile: null },
                    },
                }),
            ],
        };

        const result = validateManifest(inventory, manifest, ["HONOR.txt"]);

        assert.equal(result.ok, false);
        assert.ok(
            result.findings.some((f) => f.startsWith("coverage.missing")),
        );
        assert.ok(
            result.findings.some((f) => f.startsWith("coverage.unexpected")),
        );
        assert.ok(
            result.findings.some((f) =>
                f.startsWith("releaseDecision.action.unsupported"),
            ),
        );
        assert.ok(
            result.findings.some((f) => f.startsWith("placeholder.found")),
        );
        assert.ok(
            result.findings.some((f) => f.startsWith("licenseFile.missing")),
        );
    });

    test("does not mutate the inventory or manifest inputs", () => {
        const inventory = {
            icons: [
                { file: "roshar.svg", exportName: "Roshar", group: "custom" },
            ],
        };
        const manifest = { assets: [buildAsset({ file: "roshar.svg" })] };
        const inventorySnapshot = JSON.parse(JSON.stringify(inventory));
        const manifestSnapshot = JSON.parse(JSON.stringify(manifest));

        validateManifest(inventory, manifest, []);

        assert.deepEqual(inventory, inventorySnapshot);
        assert.deepEqual(manifest, manifestSnapshot);
    });
});
