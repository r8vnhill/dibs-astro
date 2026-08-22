import { expect, suite, test } from "vitest";
import { proportionalFontContract } from "../proportional-font-contract";

const expectedLigatures = {
    common: ["fi", "fl", "ffi", "ffl"],
    technical: ["->", "<-", "=>", "<=", ">=", "!=", "==", "===", "<->"],
} as const;

const expectedSpanishCoverage = [
    "á",
    "é",
    "í",
    "ó",
    "ú",
    "Á",
    "É",
    "Í",
    "Ó",
    "Ú",
    "ü",
    "Ü",
    "ñ",
    "Ñ",
    "¿",
    "?",
    "¡",
    "!",
    "«",
    "»",
] as const;

const expectedBodyStates = [
    { weight: 400, style: "normal" },
    { weight: 400, style: "italic" },
    { weight: 500, style: "normal" },
    { weight: 600, style: "normal" },
    { weight: 700, style: "normal" },
] as const;

const expectedHeadingStates = [
    { weight: 600, style: "normal" },
] as const;

const expectedBodyRequirements = [
    "proportional-metrics",
    "spanish-coverage",
    "common-ligatures",
    "technical-ligatures",
    "native-styles",
    "long-form-readability",
    "ui-readability",
    "genuine-italic",
    "source-preservation",
] as const;

const expectedHeadingRequirements = [
    "proportional-metrics",
    "spanish-coverage",
    "common-ligatures",
    "technical-ligatures",
    "native-styles",
    "heading-readability",
    "distinction-from-body",
    "heading-wrapping",
] as const;

const expectedPairRequirements = [
    "distinct-family",
    "clear-hierarchy",
    "visual-coherence",
    "layout-compatibility",
    "license-compatible-delivery",
] as const;

suite("given the proportional typography conformance contract", () => {
    test.each(Object.entries(expectedLigatures))(
        "then the %s ligature category contains every canonical source sequence",
        (category, sources) => {
            const cases = proportionalFontContract.ligatures.filter((ligature) => ligature.category === category);

            expect(cases.map(({ source }) => source)).toEqual(sources);
        },
    );

    test("then all ligature cases have unique ids and unique sources within their category", () => {
        const ids = proportionalFontContract.ligatures.map(({ id }) => id);
        expect(new Set(ids).size).toBe(ids.length);

        for (const category of ["common", "technical"] as const) {
            const sources = proportionalFontContract.ligatures
                .filter((ligature) => ligature.category === category)
                .map(({ source }) => source);

            expect(new Set(sources).size).toBe(sources.length);
        }
    });

    test.each(expectedSpanishCoverage)("then Spanish coverage includes %s", (character) => {
        expect(proportionalFontContract.spanishCoverage).toContain(character);
    });

    test("then the specimen corpus exercises ordinary and technical proportional prose", () => {
        const specimen = proportionalFontContract.specimenText.join(" ");

        expect(specimen).toContain("afinidad");
        expect(specimen).toContain("offline");
        expect(specimen).toContain("A -> B");
        expect(specimen).toContain("result != null");
        expect(specimen).toContain("¿");
        expect(specimen).toContain("«útil»");
    });

    suite("given the body role profile", () => {
        test("then it declares the required typography states, explicit and unique", () => {
            expect(proportionalFontContract.roles.body.states).toEqual(expectedBodyStates);

            const stateKeys = proportionalFontContract.roles.body.states.map(({ weight, style }) => `${weight}-${style}`);
            expect(new Set(stateKeys).size).toBe(stateKeys.length);
        });

        test("then it retains every Milestone 1 requirement plus source preservation and genuine italic", () => {
            expect(proportionalFontContract.roles.body.requirements.map(({ id }) => id)).toEqual(
                expectedBodyRequirements,
            );

            for (const requirement of proportionalFontContract.roles.body.requirements) {
                expect(requirement.description.length).toBeGreaterThan(0);
                expect(requirement.evidence.length).toBeGreaterThan(0);
            }
        });
    });

    suite("given the heading role profile", () => {
        test("then it declares a single native, upright weight state pending the Phase 2 weight audit", () => {
            expect(proportionalFontContract.roles.heading.states).toEqual(expectedHeadingStates);
        });

        test("then it does not require italic or source preservation, unlike the body profile", () => {
            const ids = proportionalFontContract.roles.heading.requirements.map(({ id }) => id);

            expect(ids).toEqual(expectedHeadingRequirements);
            expect(ids).not.toContain("genuine-italic");
            expect(ids).not.toContain("source-preservation");
        });

        test("then every requirement identifies its evidence mechanism", () => {
            for (const requirement of proportionalFontContract.roles.heading.requirements) {
                expect(requirement.description.length).toBeGreaterThan(0);
                expect(requirement.evidence.length).toBeGreaterThan(0);
            }
        });
    });

    suite("given the pair requirements", () => {
        test("then they identify their evidence mechanism", () => {
            expect(proportionalFontContract.pairRequirements.map(({ id }) => id)).toEqual(expectedPairRequirements);

            for (const requirement of proportionalFontContract.pairRequirements) {
                expect(requirement.description.length).toBeGreaterThan(0);
                expect(requirement.evidence.length).toBeGreaterThan(0);
            }
        });

        test("then distinct-family makes the body-family-differs-from-heading-family invariant explicit", () => {
            const distinctFamily = proportionalFontContract.pairRequirements.find(
                (requirement) => requirement.id === "distinct-family",
            );

            expect(distinctFamily).toBeDefined();
        });
    });
});
