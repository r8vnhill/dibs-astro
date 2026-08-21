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

const expectedStates = [
    { weight: 400, style: "normal" },
    { weight: 400, style: "italic" },
    { weight: 500, style: "normal" },
    { weight: 600, style: "normal" },
    { weight: 700, style: "normal" },
] as const;

const expectedRequirements = [
    "proportional-metrics",
    "long-form-readability",
    "source-preservation",
    "spanish-coverage",
    "native-styles",
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

    test("then required typography states are explicit and unique", () => {
        expect(proportionalFontContract.states).toEqual(expectedStates);

        const stateKeys = proportionalFontContract.states.map(({ weight, style }) => `${weight}-${style}`);
        expect(new Set(stateKeys).size).toBe(stateKeys.length);
    });

    test("then conformance requirements identify their evidence mechanism", () => {
        expect(proportionalFontContract.requirements.map(({ id }) => id)).toEqual(expectedRequirements);

        for (const requirement of proportionalFontContract.requirements) {
            expect(requirement.description.length).toBeGreaterThan(0);
            expect(requirement.evidence.length).toBeGreaterThan(0);
        }
    });
});
