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

describe.concurrent("LessonReadingGuide.astro render", () => {
    beforeEach(async () => {
        render = await createAstroRenderer<Props>(LessonReadingGuide);
    });

    suite("given the effort field", () => {
        test("then a reading without effort evidence renders Esfuerzo estimado: No disponible", async () => {
            const html = await render({ guide: baseGuide, reference: bookReference });

            expect(html).toContain("Esfuerzo estimado: ");
            expect(html).toContain("No disponible");
        });

        test("then a reading with a page count renders the page count", async () => {
            const html = await render({
                guide: { ...baseGuide, effort: { pageCount: 12 } },
                reference: bookReference,
            });

            expect(html).toContain("12 páginas");
        });

        test("then a reading with only a word count renders an estimated reading time", async () => {
            const html = await render({
                guide: { ...baseGuide, effort: { wordCount: 2_000 } },
                reference: bookReference,
            });

            expect(html).toContain("≈ 8 min");
        });

        test("then a video reading with a duration renders the compact duration", async () => {
            const html = await render({
                guide: { ...baseGuide, effort: { durationMinutes: 75 } },
                reference: videoReference,
            });

            expect(html).toContain("~ 1h15m");
        });

        test("then Extensión no longer appears on the rendered guide", async () => {
            const html = await render({ guide: baseGuide, reference: bookReference });

            expect(html).not.toContain("Extensión");
        });
    });
});
