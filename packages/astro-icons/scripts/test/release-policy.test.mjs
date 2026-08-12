import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
    derivePublishableIcons,
    diffAssetFileSets,
    diffSourceAgainstInventory,
    hasPermittedRedistribution,
    isIncludedAction,
    RELEASE_POLICY_FINDING_CODES,
} from "../lib/release-policy.mjs";

// Sanderson-themed fixture names only; never the real 1,521-icon production inventory.
const phosphorIcon = (file) => ({ file, exportName: file.replace(".svg", ""), group: "phosphor" });
const customIcon = (file) => ({ file, exportName: file.replace(".svg", ""), group: "custom" });

const buildAsset = (overrides = {}) => ({
    file: "roshar.svg",
    releaseDecision: { action: "exclude" },
    redistribution: { conclusion: "undetermined" },
    ...overrides,
});

const buildManifest = (assets = []) => ({ assets });

describe("Feature: release decisions constrain publication", () => {
    test("Scenario: an excluded custom asset cannot appear in a publishable artifact", () => {
        const inventory = { icons: [customIcon("roshar.svg")] };
        const manifest = buildManifest([
            buildAsset({ file: "roshar.svg", releaseDecision: { action: "exclude" } }),
        ]);

        const { publishableIcons } = derivePublishableIcons({ inventory, manifest });

        assert.deepEqual(publishableIcons, []);
    });

    test("Scenario: a baseline Phosphor asset remains publishable", () => {
        const inventory = { icons: [phosphorIcon("acorn.svg")] };
        const manifest = buildManifest();

        const { publishableIcons } = derivePublishableIcons({ inventory, manifest });

        assert.deepEqual(publishableIcons, [{ file: "acorn.svg", exportName: "acorn" }]);
    });

    test("Scenario: equal SVG counts do not imply equal publication sets", () => {
        const expected = ["roshar.svg", "scadrial.svg"];
        const actual = ["roshar.svg", "nalthis.svg"];

        const { missing, unexpected } = diffAssetFileSets(expected, actual);

        assert.deepEqual(missing, ["scadrial.svg"]);
        assert.deepEqual(unexpected, ["nalthis.svg"]);
    });
});

describe("Feature: publication evidence consistency", () => {
    test("Scenario: every custom inventory asset has release metadata", () => {
        const inventory = { icons: [customIcon("roshar.svg")] };
        const manifest = buildManifest();

        const { findings } = derivePublishableIcons({ inventory, manifest });

        assert.deepEqual(findings, [
            { code: RELEASE_POLICY_FINDING_CODES.MISSING_MANIFEST_ASSET, file: "roshar.svg" },
        ]);
    });

    test("Scenario: manifest evidence references a known inventory asset", () => {
        const inventory = { icons: [phosphorIcon("acorn.svg")] };
        const manifest = buildManifest([buildAsset({ file: "roshar.svg" })]);

        const { findings } = derivePublishableIcons({ inventory, manifest });

        assert.deepEqual(findings, [
            { code: RELEASE_POLICY_FINDING_CODES.UNKNOWN_MANIFEST_ASSET, file: "roshar.svg" },
        ]);
    });

    const releasePolicyMatrix = [
        { label: "phosphor / no manifest record required", group: "phosphor", manifestState: null, result: "publish" },
        {
            label: "custom / include+permitted",
            group: "custom",
            manifestState: { action: "include", conclusion: "permitted" },
            result: "publish",
        },
        {
            label: "custom / include+undetermined",
            group: "custom",
            manifestState: { action: "include", conclusion: "undetermined" },
            result: "policy error",
        },
        {
            label: "custom / include+restricted",
            group: "custom",
            manifestState: { action: "include", conclusion: "restricted" },
            result: "policy error",
        },
        {
            label: "custom / include+permission-required",
            group: "custom",
            manifestState: { action: "include", conclusion: "permission-required" },
            result: "policy error",
        },
        {
            label: "custom / exclude+undetermined",
            group: "custom",
            manifestState: { action: "exclude", conclusion: "undetermined" },
            result: "exclude",
        },
        {
            label: "custom / exclude+permitted",
            group: "custom",
            manifestState: { action: "exclude", conclusion: "permitted" },
            result: "exclude",
        },
    ];

    for (const { label, group, manifestState, result } of releasePolicyMatrix) {
        test(`inventory group / manifest state -> result: ${label}`, () => {
            const file = "roshar.svg";
            const inventory = { icons: [{ file, exportName: "Roshar", group }] };
            const manifest = manifestState === null
                ? buildManifest()
                : buildManifest([
                    buildAsset({
                        file,
                        releaseDecision: { action: manifestState.action },
                        redistribution: { conclusion: manifestState.conclusion },
                    }),
                ]);

            const { publishableIcons, findings } = derivePublishableIcons({ inventory, manifest });

            if (result === "publish") {
                assert.equal(publishableIcons.length, 1);
                assert.deepEqual(findings, []);
            } else if (result === "policy error") {
                assert.equal(publishableIcons.length, 0);
                assert.equal(findings.length, 1);
                assert.equal(findings[0].code, RELEASE_POLICY_FINDING_CODES.NOT_PERMITTED);
            } else {
                assert.equal(publishableIcons.length, 0);
                assert.deepEqual(findings, []);
            }
        });
    }
});

describe("Feature: release-policy invariants", () => {
    test("Scenario: input ordering does not change publication policy", () => {
        const inventory = {
            icons: [phosphorIcon("acorn.svg"), customIcon("roshar.svg"), phosphorIcon("scadrial.svg")],
        };
        const manifest = buildManifest([
            buildAsset({
                file: "roshar.svg",
                releaseDecision: { action: "include" },
                redistribution: { conclusion: "permitted" },
            }),
        ]);
        const reversedInventory = { icons: [...inventory.icons].reverse() };
        const reversedManifest = buildManifest([...manifest.assets].reverse());

        const forward = derivePublishableIcons({ inventory, manifest });
        const backward = derivePublishableIcons({ inventory: reversedInventory, manifest: reversedManifest });

        assert.deepEqual(forward, backward);
    });

    test("Scenario: an unrelated non-asset manifest property does not change publication policy", () => {
        const inventory = { icons: [phosphorIcon("acorn.svg")] };
        const manifest = buildManifest();
        const manifestWithExtraProperty = { ...manifest, reviewStatus: "in-progress" };

        const before = derivePublishableIcons({ inventory, manifest });
        const after = derivePublishableIcons({ inventory, manifest: manifestWithExtraProperty });

        assert.deepEqual(before, after);
    });

    test("Scenario: publication policy output is sorted deterministically by filename", () => {
        const inventory = {
            icons: [phosphorIcon("scadrial.svg"), phosphorIcon("acorn.svg"), phosphorIcon("nalthis.svg")],
        };

        const { publishableIcons } = derivePublishableIcons({ inventory, manifest: buildManifest() });

        assert.deepEqual(
            publishableIcons.map((icon) => icon.file),
            ["acorn.svg", "nalthis.svg", "scadrial.svg"],
        );
    });
});

describe("Feature: frozen inventory authority", () => {
    test("Scenario: an unreviewed source SVG cannot become publishable", () => {
        const findings = diffSourceAgainstInventory({
            inventoryFiles: ["roshar.svg"],
            sourceFiles: ["roshar.svg", "worldhopper.svg"],
        });

        assert.deepEqual(findings, [
            { code: RELEASE_POLICY_FINDING_CODES.UNTRACKED_SOURCE, file: "worldhopper.svg" },
        ]);
    });

    test("Scenario: a frozen inventory member must still exist in source", () => {
        const findings = diffSourceAgainstInventory({
            inventoryFiles: ["roshar.svg"],
            sourceFiles: [],
        });

        assert.deepEqual(findings, [
            { code: RELEASE_POLICY_FINDING_CODES.MISSING_SOURCE, file: "roshar.svg" },
        ]);
    });

    const sourceDriftMatrix = [
        { label: "present / present", inventory: ["roshar.svg"], source: ["roshar.svg"], expectedCodes: [] },
        {
            label: "present / absent",
            inventory: ["roshar.svg"],
            source: [],
            expectedCodes: [RELEASE_POLICY_FINDING_CODES.MISSING_SOURCE],
        },
        {
            label: "absent / present",
            inventory: [],
            source: ["worldhopper.svg"],
            expectedCodes: [RELEASE_POLICY_FINDING_CODES.UNTRACKED_SOURCE],
        },
    ];

    for (const { label, inventory, source, expectedCodes } of sourceDriftMatrix) {
        test(`inventory/source presence -> result: ${label}`, () => {
            const findings = diffSourceAgainstInventory({
                inventoryFiles: inventory,
                sourceFiles: source,
            });

            assert.deepEqual(findings.map((finding) => finding.code), expectedCodes);
        });
    }
});

describe("Feature: release-policy vocabulary", () => {
    const invalidVocabularyMatrix = [
        { label: "unknown releaseDecision.action", action: "experimental", conclusion: "permitted" },
        { label: "unknown redistribution.conclusion", action: "include", conclusion: "unknown" },
    ];

    for (const { label, action, conclusion } of invalidVocabularyMatrix) {
        test(`Scenario Outline: unknown release vocabulary blocks publication - ${label}`, () => {
            const inventory = { icons: [customIcon("roshar.svg")] };
            const manifest = buildManifest([
                buildAsset({
                    file: "roshar.svg",
                    releaseDecision: { action },
                    redistribution: { conclusion },
                }),
            ]);

            const { publishableIcons, findings } = derivePublishableIcons({ inventory, manifest });

            assert.deepEqual(publishableIcons, []);
            assert.ok(
                findings.some((finding) =>
                    finding.code === RELEASE_POLICY_FINDING_CODES.INVALID_RELEASE_VOCABULARY &&
                    finding.file === "roshar.svg"
                ),
            );
        });
    }

    test("Scenario: duplicate manifest assets block publication", () => {
        const inventory = { icons: [customIcon("roshar.svg")] };
        const manifest = buildManifest([
            buildAsset({ file: "roshar.svg", releaseDecision: { action: "include" }, redistribution: { conclusion: "permitted" } }),
            buildAsset({ file: "roshar.svg", releaseDecision: { action: "exclude" } }),
        ]);

        const { publishableIcons, findings } = derivePublishableIcons({ inventory, manifest });

        assert.deepEqual(publishableIcons, []);
        assert.ok(
            findings.some((finding) =>
                finding.code === RELEASE_POLICY_FINDING_CODES.DUPLICATE_MANIFEST_ASSET &&
                finding.file === "roshar.svg"
            ),
        );
    });
});

describe("centralized predicates", () => {
    test("isIncludedAction reflects releaseDecision.action without callers re-deriving it", () => {
        assert.equal(isIncludedAction(buildAsset({ releaseDecision: { action: "include" } })), true);
        assert.equal(isIncludedAction(buildAsset({ releaseDecision: { action: "exclude" } })), false);
        assert.equal(isIncludedAction(undefined), false);
    });

    test("hasPermittedRedistribution reflects redistribution.conclusion", () => {
        assert.equal(
            hasPermittedRedistribution(buildAsset({ redistribution: { conclusion: "permitted" } })),
            true,
        );
        assert.equal(
            hasPermittedRedistribution(buildAsset({ redistribution: { conclusion: "restricted" } })),
            false,
        );
    });
});
