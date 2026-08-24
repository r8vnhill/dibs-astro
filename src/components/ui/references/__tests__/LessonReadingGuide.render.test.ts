/**
 * Render tests for `../LessonReadingGuide.astro`, the shared component every lesson readings page uses to
 * present one reading's editorial guidance. Covers the estimated-effort line and the guiding-question block's
 * markup contract; see `LessonReadingGuide.astro`'s own doc comment for the fields it renders.
 */
import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, suite, test } from "vitest";
import type { NormalizedReference } from "~/lib/bibliography";
import type { LessonReadingGuide as LessonReadingGuideModel } from "~/lib/readings/lesson-readings-contract";
import { type AstroRender, createAstroRenderer } from "../../../../test-utils/astro-render";
import LessonReadingGuide from "../LessonReadingGuide.astro";

type Props = { guide: LessonReadingGuideModel; reference: NormalizedReference };

const baseGuide: LessonReadingGuideModel = {
    difficulty: "Intermedia",
    whatToRead: "Capítulo 20, §§20.1 y 20.4.",
    why: "why",
    focus: "focus",
    guidingQuestion: "question",
};

const bookReference = {
    id: "ref:book",
    type: "Book",
    rawType: "Book",
    title: "Book",
    authors: [],
    keywords: [],
    chapter: "Chapter",
    bookTitle: "Book title",
} as NormalizedReference;

const videoReference = {
    id: "ref:video",
    type: "VideoObject",
    rawType: "VideoObject",
    title: "Video",
    authors: [],
    keywords: [],
    url: "https://example.com/video",
} as NormalizedReference;

let render: AstroRender<Props>;

// Shared by both suites below so each test states only the guide/reference it actually varies,
// instead of repeating the render-then-parse boilerplate.
async function renderHtml(guide: LessonReadingGuideModel, reference: NormalizedReference = bookReference) {
    return render({ guide, reference });
}

async function renderGuideDocument(guide: LessonReadingGuideModel = baseGuide) {
    const html = await renderHtml(guide);
    return new JSDOM(html).window.document;
}

describe.concurrent("LessonReadingGuide.astro render", () => {
    beforeEach(async () => {
        render = await createAstroRenderer<Props>(LessonReadingGuide);
    });

    suite("given the effort field", () => {
        test("then a reading without effort evidence renders Esfuerzo estimado: No disponible", async () => {
            const html = await renderHtml(baseGuide);

            expect(html).toContain("Esfuerzo estimado: ");
            expect(html).toContain("No disponible");
        });

        test("then a reading with a page count renders the page count", async () => {
            const html = await renderHtml({ ...baseGuide, effort: { pageCount: 12 } });

            expect(html).toContain("12 páginas");
        });

        test("then a reading with only a word count renders an estimated reading time", async () => {
            const html = await renderHtml({ ...baseGuide, effort: { wordCount: 2_000 } });

            expect(html).toContain("≈ 8 min");
        });

        test("then a video reading with a duration renders the compact duration", async () => {
            const html = await renderHtml({ ...baseGuide, effort: { durationMinutes: 75 } }, videoReference);

            expect(html).toContain("~ 1h15m");
        });

        test("then Extensión no longer appears on the rendered guide", async () => {
            const html = await renderHtml(baseGuide);

            expect(html).not.toContain("Extensión");
        });
    });

    // The guiding question renders outside the descriptive `<dl>`, in its own
    // `[data-reading-guide-question]` block (see LessonReadingGuide.astro), so it reads as a distinct
    // retrieval task rather than one more descriptive field. These tests pin that observable structure —
    // not its styling — so the exact visual treatment stays free to change.
    suite("given the guiding question", () => {
        test("then Qué leer, Por qué, and Qué buscar remain inside the descriptive dl", async () => {
            const doc = await renderGuideDocument();
            const dl = doc.querySelector("dl");

            expect(dl).not.toBeNull();
            expect(dl?.textContent).toContain("Qué leer");
            expect(dl?.textContent).toContain("Por qué");
            expect(dl?.textContent).toContain("Qué buscar");
        });

        test("then the question is no longer a dt/dd entry inside the dl", async () => {
            const doc = await renderGuideDocument();
            const dl = doc.querySelector("dl");

            expect(dl?.textContent).not.toContain("Comprueba tu comprensión");
            expect(doc.querySelectorAll("dt, dd").length).toBe(dl?.querySelectorAll("dt, dd").length);
        });

        test("then the question renders inside a dedicated data-reading-guide-question block", async () => {
            const doc = await renderGuideDocument();
            const block = doc.querySelector("[data-reading-guide-question]");

            expect(block).not.toBeNull();
            expect(block?.textContent).toContain("Comprueba tu comprensión");
            expect(block?.textContent).toContain(baseGuide.guidingQuestion);
        });

        test("then the retrieval-task block introduces no heading level", async () => {
            const doc = await renderGuideDocument();
            const block = doc.querySelector("[data-reading-guide-question]");

            expect(block?.querySelector("h1, h2, h3, h4, h5, h6")).toBeNull();
        });

        test("then actionable guidance, metadata, and the retrieval task are separate regions", async () => {
            const doc = await renderGuideDocument();
            const guidance = doc.querySelector("[data-reading-guidance]");
            const metadata = doc.querySelector("[data-reading-metadata]");
            const question = doc.querySelector("[data-reading-guide-question]");

            expect(guidance).not.toBeNull();
            expect(guidance?.textContent).toContain("Qué leer");
            expect(guidance?.textContent).toContain("Qué buscar");
            expect(guidance?.textContent).toContain("Por qué");
            expect(metadata).not.toBeNull();
            expect(metadata?.querySelectorAll(".sr-only")).not.toHaveLength(0);
            expect(question).not.toBeNull();
            expect(guidance?.contains(question as Node)).toBe(false);
            expect(metadata?.contains(question as Node)).toBe(false);
        });

        test("then the actionable fields precede the supporting reason", async () => {
            const doc = await renderGuideDocument();
            const labels = [...doc.querySelectorAll("[data-reading-guidance] dt")].map((label) => label.textContent);

            expect(labels).toEqual(["Qué leer", "Qué buscar", "Por qué"]);
        });
    });
});
