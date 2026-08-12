import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
    derivePublishableIcons,
    diffAssetFileSets,
    hasPermittedRedistribution,
    isIncludedAction,
    RELEASE_POLICY_FINDING_CODES,
} from "../lib/release-policy.mjs";

if (test.each === undefined) {
    test.each = (cases) => (name, fn) => {
        for (const testCase of cases) {
            const args = Array.isArray(testCase) ? testCase : [testCase];
            test(
                name.replaceAll("%s", args.map(String).join(",")),
                () => fn(...args),
            );
        }
    };
}

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
