/**
 * Pins the heading-evaluation model so the fixture page and its browser tests can trust it.
 *
 * These checks lock the facts other code depends on: the two families and their order, that both
 * derive their states from the shared contract (not a local copy), the canonical case ids, and the
 * "H1/H2 bold, H3/H4 medium" weight convention. If a future edit changes any of these, this suite
 * fails here rather than surfacing as a confusing render- or screenshot-test failure downstream.
 */

import { expect, suite, test } from "vitest";
import {
    headingEvaluationCases,
    headingEvaluationFamilies,
    headingEvaluationRepresentativeStates,
} from "../heading-font-evaluation-fixture";
import { proportionalFontContract } from "../proportional-font-contract";

suite("given the heading font evaluation fixture model", () => {
    test("then it exposes exactly the candidate and pinned reference families", () => {
        expect(headingEvaluationFamilies.map(({ id, kind, label }) => ({ id, kind, label }))).toEqual([
            { id: "dibs-slab", kind: "candidate", label: "DIBS Slab" },
            { id: "space-grotesk-reference", kind: "reference", label: "Space Grotesk Reference 2.0.0" },
        ]);
    });

    test("then both families derive the heading states from the shared contract", () => {
        for (const family of headingEvaluationFamilies) {
            expect(family.states).toBe(proportionalFontContract.roles.heading.states);
            expect(family.states).toEqual([
                { weight: 500, style: "normal" },
                { weight: 700, style: "normal" },
            ]);
        }
    });

    test("then every canonical case has a stable semantic level and source text", () => {
        expect(headingEvaluationCases.map(({ id }) => id)).toEqual([
            "h1-short",
            "h1-long",
            "h2-short",
            "h2-long",
            "h3",
            "h4",
            "spanish-coverage",
            "common-ligatures",
            "technical-notation",
        ]);
        expect(headingEvaluationCases.every(({ text, semanticLevel }) => text.length > 0 && semanticLevel)).toBe(true);
    });

    test("then representative hierarchy states keep H1/H2 bold and H3/H4 medium", () => {
        expect(headingEvaluationRepresentativeStates).toEqual([
            { id: "h1-short", representativeWeight: 700 },
            { id: "h1-long", representativeWeight: 700 },
            { id: "h2-short", representativeWeight: 700 },
            { id: "h2-long", representativeWeight: 700 },
            { id: "h3", representativeWeight: 500 },
            { id: "h4", representativeWeight: 500 },
        ]);
    });
});
