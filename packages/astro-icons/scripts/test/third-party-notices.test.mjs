import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
    renderThirdPartyNotice,
    renderPhosphorSection,
    renderAssetSection,
    renderTrademarkNotice,
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

describe("module contract", () => {
    test("exports the four pure renderer functions", () => {
        assert.equal(typeof renderThirdPartyNotice, "function");
        assert.equal(typeof renderPhosphorSection, "function");
        assert.equal(typeof renderAssetSection, "function");
        assert.equal(typeof renderTrademarkNotice, "function");
    });
});

describe("renderThirdPartyNotice", () => {
    test("renders one Phosphor section and one section per asset, ordered by file", () => {
        const manifest = {
            phosphor: buildPhosphor(),
            assets: [
                buildAsset({
                    displayName: "Scadrial logo",
                    file: "scadrial.svg",
                }),
                buildAsset({ displayName: "Roshar logo", file: "roshar.svg" }),
            ],
        };

        const notice = renderThirdPartyNotice(manifest);

        assert.equal(notice.match(/## Phosphor Icons/gu)?.length, 1);
        assert.match(notice, /## Roshar logo/u);
        assert.match(notice, /## Scadrial logo/u);

        const rosharIndex = notice.indexOf("## Roshar logo");
        const scadrialIndex = notice.indexOf("## Scadrial logo");
        assert.ok(rosharIndex < scadrialIndex);
    });

    test("places the Phosphor section before any asset section", () => {
        const manifest = {
            phosphor: buildPhosphor(),
            assets: [
                buildAsset({
                    displayName: "Nalthis logo",
                    file: "nalthis.svg",
                }),
            ],
        };

        const notice = renderThirdPartyNotice(manifest);
        const phosphorIndex = notice.indexOf("## Phosphor Icons");
        const assetIndex = notice.indexOf("## Nalthis logo");

        assert.ok(phosphorIndex >= 0 && assetIndex >= 0);
        assert.ok(phosphorIndex < assetIndex);
    });

    test("renders byte-identical output for the same manifest input twice", () => {
        const manifest = {
            phosphor: buildPhosphor(),
            assets: [buildAsset()],
        };

        assert.equal(
            renderThirdPartyNotice(manifest),
            renderThirdPartyNotice(manifest),
        );
    });

    test("ends with exactly one trailing newline", () => {
        const manifest = { phosphor: buildPhosphor(), assets: [buildAsset()] };
        const notice = renderThirdPartyNotice(manifest);

        assert.ok(notice.endsWith("\n"));
        assert.ok(!notice.endsWith("\n\n"));
    });

    test("contains no timestamp-shaped substring", () => {
        const manifest = { phosphor: buildPhosphor(), assets: [buildAsset()] };
        const notice = renderThirdPartyNotice(manifest);

        assert.doesNotMatch(notice, /\d{4}-\d{2}-\d{2}/u);
        assert.doesNotMatch(notice, /\d{2}:\d{2}:\d{2}/u);
    });
});

describe("renderPhosphorSection", () => {
    test("states unresolved source evidence without claiming a verified upstream commit", () => {
        const section = renderPhosphorSection(
            buildPhosphor({ source: { evidenceStatus: "unresolved" } }),
        );

        assert.match(section, /unresolved/iu);
        assert.doesNotMatch(section, /verified upstream/iu);
        assert.doesNotMatch(section, /exact upstream commit/iu);
        assert.doesNotMatch(section, /clean lineage/iu);
    });

    test("includes the project name, concluded license, and copyright notice", () => {
        const section = renderPhosphorSection(buildPhosphor());

        assert.match(section, /Phosphor Icons/u);
        assert.match(section, /MIT/u);
        assert.match(section, /Copyright \(c\) 2020-2024 Phosphor Icons/u);
    });

    test("references LICENSES/PHOSPHOR.txt textually", () => {
        const section = renderPhosphorSection(buildPhosphor());
        assert.match(section, /LICENSES\/PHOSPHOR\.txt/u);
    });
});

describe("renderAssetSection", () => {
    test("renders an excluded, permission-required asset without implying permission", () => {
        const section = renderAssetSection(
            buildAsset({
                displayName: "Roshar logo",
                releaseDecision: { action: "exclude" },
                redistribution: { conclusion: "permission-required" },
            }),
        );

        assert.match(section, /Recorded release decision: exclude/u);
        assert.match(
            section,
            /Redistribution conclusion: permission-required/u,
        );
        assert.doesNotMatch(section, /approved/iu);
        assert.doesNotMatch(section, /cleared/iu);
        assert.doesNotMatch(section, /permission granted/iu);
    });

    test("includes displayName, file, assetType, and copyright conclusion", () => {
        const section = renderAssetSection(buildAsset());

        assert.match(section, /## Roshar logo/u);
        assert.match(section, /`roshar\.svg`/u);
        assert.match(section, /Asset type: logo/u);
        assert.match(section, /Copyright conclusion: NOASSERTION/u);
    });

    test("includes copyright basis only when present", () => {
        const withBasis = renderAssetSection(
            buildAsset({
                rights: {
                    copyright: {
                        concludedLicense: "NOASSERTION",
                        basis: "Sourced from Silence Divine",
                    },
                    trademark: {
                        applies: "unknown",
                        owner: null,
                        policyUrl: null,
                        notes: null,
                    },
                },
            }),
        );
        const withoutBasis = renderAssetSection(buildAsset());

        assert.match(
            withBasis,
            /Copyright basis: Sourced from Silence Divine/u,
        );
        assert.doesNotMatch(withoutBasis, /Copyright basis:/u);
    });

    test("includes a trademark line only when trademark applies", () => {
        const applies = renderAssetSection(
            buildAsset({
                rights: {
                    copyright: { concludedLicense: "NOASSERTION", basis: null },
                    trademark: {
                        applies: "yes",
                        owner: "Knights Radiant",
                        policyUrl: "https://example.invalid/radiant-policy",
                        notes: null,
                    },
                },
            }),
        );
        const unknown = renderAssetSection(buildAsset());

        assert.match(applies, /Knights Radiant/u);
        assert.doesNotMatch(unknown, /Trademark:/u);
    });
});

describe("renderTrademarkNotice", () => {
    test("renders owner and policy URL when trademark applies", () => {
        const notice = renderTrademarkNotice({
            applies: "yes",
            owner: "Knights Radiant",
            policyUrl: "https://example.invalid/radiant-policy",
            notes: null,
        });

        assert.match(notice, /Knights Radiant/u);
        assert.match(notice, /https:\/\/example\.invalid\/radiant-policy/u);
    });

    test("renders nothing when trademark applicability is unknown", () => {
        const notice = renderTrademarkNotice({
            applies: "unknown",
            owner: null,
            policyUrl: null,
            notes: null,
        });

        assert.equal(notice, "");
    });

    test("does not produce the literal string 'undefined' for missing optional fields", () => {
        const notice = renderTrademarkNotice({ applies: "yes" });
        assert.doesNotMatch(notice, /undefined/u);
    });
});
