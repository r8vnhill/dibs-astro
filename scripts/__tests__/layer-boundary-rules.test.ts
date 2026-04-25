import { describe, expect, test } from "vitest";

import {
    allowedExceptions,
    boundaryRules,
    initialBoundaryRules,
} from "../lib/layer-boundary-rules.mjs";

const expectedRuleOrder = [
    "domain-boundary",
    "application-boundary",
    "infrastructure-boundary",
    "presentation-adapter-boundary",
    "ui-boundary",
];

const expectedSources = [
    ["domain-boundary", "domain"],
    ["application-boundary", "application"],
    ["infrastructure-boundary", "infrastructure"],
    ["presentation-adapter-boundary", "presentation-adapter"],
    ["ui-boundary", "ui"],
];

function ruleById(id) {
    const rule = boundaryRules.find((candidate) => candidate.id === id);

    if (!rule) {
        throw new Error(`Missing boundary rule: ${id}`);
    }

    return rule;
}

describe("boundaryRules", () => {
    test("exposes the Cycle 2 rules in source-layer order", () => {
        expect(boundaryRules.map((rule) => rule.id)).toEqual(expectedRuleOrder);
    });

    test.each(expectedSources)("%s targets source layer %s", (id, source) => {
        expect(ruleById(id).source).toBe(source);
    });

    test("uses a single source-layer string for every rule", () => {
        expect(boundaryRules.every((rule) => typeof rule.source === "string")).toBe(true);
        expect(boundaryRules.every((rule) => !Array.isArray(rule.source))).toBe(true);
    });

    test("has unique rule ids and sources", () => {
        expect(new Set(boundaryRules.map((rule) => rule.id)).size).toBe(boundaryRules.length);
        expect(new Set(boundaryRules.map((rule) => rule.source)).size).toBe(boundaryRules.length);
    });

    test("has stable human-facing message and suggestion text for every rule", () => {
        for (const rule of boundaryRules) {
            expect(rule.message.trim()).not.toBe("");
            expect(rule.suggestion.trim()).not.toBe("");
        }

        expect(new Set(boundaryRules.map((rule) => rule.message)).size).toBe(boundaryRules.length);
    });
});

describe("Cycle 2 rule matrix", () => {
    test("domain allows only domain targets", () => {
        expect(ruleById("domain-boundary").allowedTargets).toEqual(["domain"]);
    });

    test("application allows only domain and application targets", () => {
        expect(ruleById("application-boundary").allowedTargets).toEqual([
            "domain",
            "application",
        ]);
    });

    test("domain and application forbid framework packages", () => {
        expect(ruleById("domain-boundary").forbiddenPackages).toEqual([
            "astro",
            "react",
            "zod",
        ]);
        expect(ruleById("application-boundary").forbiddenPackages).toEqual([
            "astro",
            "react",
            "zod",
        ]);
    });

    test.each([
        "infrastructure-boundary",
        "presentation-adapter-boundary",
        "ui-boundary",
    ])("%s does not forbid packages", (id) => {
        expect(ruleById(id).forbiddenPackages).toEqual([]);
    });

    test("UI allows domain and application but forbids only infrastructure", () => {
        const uiRule = ruleById("ui-boundary");

        expect(uiRule.allowedTargets).toEqual(expect.arrayContaining(["domain", "application"]));
        expect(uiRule.forbiddenTargets).toEqual(["infrastructure"]);
    });

    test("generated data is blocked from inner layers and allowed from infrastructure", () => {
        expect(ruleById("domain-boundary").forbiddenTargets).toContain("generated-data");
        expect(ruleById("application-boundary").forbiddenTargets).toContain("generated-data");
        expect(ruleById("infrastructure-boundary").allowedTargets).toContain("generated-data");
    });

    test("presentation adapters forbid UI targets", () => {
        expect(ruleById("presentation-adapter-boundary").forbiddenTargets).toEqual(["ui"]);
    });
});

describe("allowedExceptions", () => {
    test("starts empty by default", () => {
        expect(allowedExceptions).toEqual([]);
    });
});

describe("initialBoundaryRules", () => {
    test("uses the Cycle 2 rule matrix", () => {
        expect(initialBoundaryRules).toBe(boundaryRules);
    });
});
