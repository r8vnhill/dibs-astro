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
        if (result.ok) expect(result.value.sections[0]?.readings).toHaveLength(1);
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
