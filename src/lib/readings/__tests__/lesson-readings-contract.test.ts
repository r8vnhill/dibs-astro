import { expect, suite, test } from "vitest";
import type { BibliographyCatalog, NormalizedReference } from "~/lib/bibliography";
import { normalizeReferenceId, resolveLessonReadings } from "../lesson-readings-contract";

const reference = {
    id: "ref:known",
    type: "WebPage",
    rawType: "WebPage",
    title: "Known",
    authors: [],
    keywords: [],
    url: "https://example.com",
} as NormalizedReference;
const catalog = { referencesById: new Map([[reference.id, reference]]) } as unknown as BibliographyCatalog;
const guide = {
    referenceId: "known",
    type: "Conceptual",
    difficulty: "Introductoria",
    extent: "Corta",
    whatToRead: "what",
    why: "why",
    focus: "focus",
    guidingQuestion: "question",
} as const;

suite("given lesson reading identities", () => {
    test.each([
        ["known", "ref:known"],
        ["ref:known", "ref:known"],
    ])("then canonicalizes %s as %s", (input, expected) => {
        expect(normalizeReferenceId(input)).toBe(expected);
    });
});

suite("given a lesson readings configuration", () => {
    const configuration = {
        lessonPath: "/notes/example/",
        title: "Example",
        essential: [guide],
        practice: [],
        deeper: [],
    } as const;

    test("then resolves every configured entry exactly once", () => {
        const result = resolveLessonReadings(configuration, catalog);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.sections.map((section) => section.title)).toEqual([
                "Lecturas esenciales",
                "De la idea a la práctica",
                "Para profundizar",
            ]);
            expect(result.value.sections[0]?.readings).toHaveLength(1);
        }
    });

    test.each([
        [
            {
                essential: "Para acompañar la lección",
                practice: "Para conectar con sistemas de construcción",
                deeper: "Si quieres profundizar",
            },
            ["Para acompañar la lección", "Para conectar con sistemas de construcción", "Si quieres profundizar"],
        ],
        [
            { essential: "Lectura principal" },
            ["Lectura principal", "De la idea a la práctica", "Para profundizar"],
        ],
    ])("then resolves configured section headings over the defaults", (sectionHeadings, expectedTitles) => {
        const result = resolveLessonReadings({ ...configuration, sectionHeadings }, catalog);

        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value.sections.map((section) => section.title)).toEqual(expectedTitles);
    });

    test("then aggregates missing and duplicate entries without partial success", () => {
        const result = resolveLessonReadings({
            ...configuration,
            essential: [guide, { ...guide, referenceId: "missing" }],
            practice: [{ ...guide, referenceId: "ref:known" }],
        }, catalog);

        expect(result).toMatchObject({ ok: false });
        if (!result.ok) {
            expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
                "missing-reference",
                "duplicate-reference",
            ]);
        }
    });

    test("then retains an optional purpose unchanged", () => {
        const result = resolveLessonReadings({
            ...configuration,
            essential: [{ ...guide, purpose: "Profundiza en órdenes parciales" }],
        }, catalog);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.sections[0]?.readings[0]?.guide.purpose).toBe("Profundiza en órdenes parciales");
        }
    });

    test("then leaves purpose absent when not configured", () => {
        const result = resolveLessonReadings(configuration, catalog);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.sections[0]?.readings[0]?.guide.purpose).toBeUndefined();
        }
    });

    test("then reports malformed IDs without querying or branding them", () => {
        const result = resolveLessonReadings({
            ...configuration,
            essential: [{ ...guide, referenceId: "not valid" }],
        }, catalog);

        expect(result).toMatchObject({ ok: false });
        if (!result.ok) {
            expect(result.diagnostics).toEqual([
                {
                    code: "invalid-reference-id",
                    lessonPath: "/notes/example/",
                    section: "Lecturas esenciales",
                    configuredId: "not valid",
                },
            ]);
        }
    });
});
