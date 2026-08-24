/**
 * Verifies the presentation boundary between canonical references and guided reading pages.
 *
 * Contributors can use this suite when adding a reference type: guided mode must expose the four stable regions,
 * while default mode must keep its ordinary bibliography contract.
 */
import { JSDOM } from "jsdom";
import { expect, suite, test } from "vitest";
import type { NormalizedReference } from "~/lib/bibliography";
import type { LessonReadingGuide } from "~/lib/readings/lesson-readings-contract";
import { createAstroRenderer } from "../../../../test-utils/astro-render";
import GuidedReferenceEntry from "../GuidedReferenceEntry.astro";
import type { PreparedReferenceSlots } from "../reference-content";
import ReferenceEntry from "../ReferenceEntry.astro";

const guide: LessonReadingGuide = {
    difficulty: "Intermedia",
    whatToRead: "La sección seleccionada.",
    why: "Conecta la fuente con la lección.",
    focus: "La idea central.",
    guidingQuestion: "¿Qué idea puedes recuperar?",
};

const references = [
    {
        name: "book",
        reference: {
            id: "ref:guided-book",
            type: "Book",
            rawType: "Book",
            title: "A Guided Book",
            authors: [{ fullName: "Ada Lovelace", lastName: "Lovelace" }],
            keywords: [],
            chapter: "Selected chapter",
            bookTitle: "A Guided Book",
        } as NormalizedReference,
        identifyingText: "Selected chapter",
        titleHref: undefined,
    },
    {
        name: "scholarly article",
        reference: {
            id: "ref:guided-article",
            type: "ScholarlyArticle",
            rawType: "ScholarlyArticle",
            title: "A Guided Article",
            authors: [],
            keywords: [],
            url: "https://example.com/article",
        } as NormalizedReference,
        identifyingText: "A Guided Article",
        titleHref: "https://example.com/article",
    },
    {
        name: "web page",
        reference: {
            id: "ref:guided-web",
            type: "WebPage",
            rawType: "WebPage",
            title: "A Guided Web Page",
            authors: [],
            keywords: [],
            url: "https://example.com/page",
        } as NormalizedReference,
        identifyingText: "A Guided Web Page",
        titleHref: "https://example.com/page",
    },
    {
        name: "video",
        reference: {
            id: "ref:guided-video",
            type: "VideoObject",
            rawType: "VideoObject",
            title: "A Guided Video",
            authors: [],
            keywords: [],
            url: "https://example.com/video",
        } as NormalizedReference,
        identifyingText: "A Guided Video",
        titleHref: "https://example.com/video",
    },
    {
        name: "thesis",
        reference: {
            id: "ref:guided-thesis",
            type: "Thesis",
            rawType: "Thesis",
            title: "A Guided Thesis",
            authors: [],
            keywords: [],
            url: "https://example.com/thesis",
        } as NormalizedReference,
        identifyingText: "A Guided Thesis",
        titleHref: "https://example.com/thesis",
    },
] as const;

suite("given a reference rendered in guided-reading context", () => {
    test.each(references)("then $name exposes the shared guided structure", async ({
        reference,
        identifyingText,
        titleHref,
    }) => {
        const render = await createAstroRenderer<{ reference: NormalizedReference; reading: LessonReadingGuide }>(
            GuidedReferenceEntry,
        );
        const html = await render({ reference, reading: guide });
        const document = new JSDOM(html).window.document;
        const item = document.querySelector("li[data-guided-reference=\"true\"]");

        expect(item).not.toBeNull();
        expect(item?.id).toBe(reference.id.replaceAll(":", "-"));
        expect(item?.querySelector("[data-reference-identity]")).not.toBeNull();
        expect(item?.querySelector("[data-reading-guidance]")).not.toBeNull();
        expect(item?.querySelector("[data-reading-metadata]")).not.toBeNull();
        expect(item?.querySelector("[data-reading-guide-question]")).not.toBeNull();
        expect(item?.textContent).toContain(identifyingText);

        if (titleHref) {
            expect(item?.querySelector(`a[href="${titleHref}"]`)).not.toBeNull();
        }
    });
});

suite("given a reference rendered without a guided presentation", () => {
    test("then the default renderer does not expose guided-reference state", async () => {
        const reference = references[1].reference;
        const render = await createAstroRenderer<{
            reference: NormalizedReference;
            preparedSlots: PreparedReferenceSlots;
        }>(ReferenceEntry);
        const html = await render({ reference, preparedSlots: {} });
        const document = new JSDOM(html).window.document;

        expect(document.querySelector("li[data-guided-reference]")).toBeNull();
        expect(document.querySelector("a[href=\"https://example.com/article\"]")).not.toBeNull();
    });
});
